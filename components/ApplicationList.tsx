import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Application, ApplicationStatus, TestStatus } from '../types';
import { getDeadlineInfo, STATUS_LABELS, STATUS_OPTIONS, TAG_PRESETS } from '../constants';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { universityKey } from '../utils/universityBatch';
import { cardContainerVariants, cardVariants } from '../hooks/useAnimations';
import Tooltip from './Tooltip';
import VirtualizedList from './VirtualizedList';
import { SkeletonCard } from './SkeletonLoader';
import EmptyState from './EmptyState';
import ContextMenu from './ContextMenu';
import StatusBadge from './StatusBadge';
import { MaterialIcon } from './ApplicationFormUI';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onDeleteUniversity?: (universityName: string) => void;
  onRenameUniversity?: (universityName: string) => void;
  onSetUniversityStatus?: (universityName: string, status: ApplicationStatus) => void;
  onUpdate: (app: Application) => void;
  onDuplicate: (id: string) => void;
  hasActiveFilter: boolean;
  groupByUniversity?: boolean;
  // Bulk selection props (optional for backward compatibility)
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onEnterSelectionMode?: () => void;
  visibleColumns?: string[];
}

const headerActionClass = 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full text-[#f4f4f5] border border-[#27272a] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#dc2626]';

const CardActions: React.FC<{
  app: Application;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  onDuplicate: (id: string) => void;
}> = ({ app, onEdit, onDelete, onUpdate, onDuplicate }) => (
  <div className="absolute top-4 right-4 z-10 flex gap-2">
    <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100 transition-opacity">
      <Tooltip content={app.isPinned ? 'Unpin Application' : 'Pin to Top'}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onUpdate({ ...app, isPinned: !app.isPinned }); }}
          className={`p-2 liquid-glass rounded-full shadow-sm transition-colors ${app.isPinned
            ? 'text-amber-500 hover:bg-amber-500/10'
            : 'text-[#a1a1aa] hover:bg-[#27272a]/60'
            }`}
          title={app.isPinned ? 'Unpin' : 'Pin to top'}
          aria-label={app.isPinned ? 'Unpin application' : 'Pin application to top'}
        >
          <MaterialIcon name="push_pin" className="text-lg" />
        </button>
      </Tooltip>
      <Tooltip content="Edit Application">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(app); }}
          className="p-2 liquid-glass text-[#a1a1aa] rounded-full shadow-sm hover:bg-[#27272a] hover:text-white transition-colors"
          title="Edit"
          aria-label="Edit application"
        >
          <MaterialIcon name="edit" className="text-lg" />
        </button>
      </Tooltip>
      <Tooltip content="Duplicate Application">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(app.id); }}
          className="p-2 liquid-glass text-[#a1a1aa] rounded-full shadow-sm hover:bg-[#27272a] hover:text-white transition-colors"
          title="Duplicate"
          aria-label="Duplicate application"
        >
          <MaterialIcon name="content_copy" className="text-lg" />
        </button>
      </Tooltip>
    </div>
    <Tooltip content="Delete Application">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
        className="p-2 liquid-glass text-[#a1a1aa] rounded-full shadow-sm hover:bg-red-900/20 hover:text-red-500 transition-colors"
        title="Delete"
        aria-label="Delete application"
      >
        <MaterialIcon name="delete" className="text-lg" />
      </button>
    </Tooltip>
  </div>
);

const calculateProgress = (app: Application): number => {
  let progress = 0;
  if (app.status === ApplicationStatus.Submitted || app.status === ApplicationStatus.Accepted || app.status === ApplicationStatus.Rejected || app.status === ApplicationStatus.Waitlisted) return 100;

  // Basic info filled (always true if created)
  progress += 10;

  // Documents
  const docs = Object.values(app.documents);
  const requiredDocs = docs.filter(d => d.required);
  const submittedDocs = requiredDocs.filter(d => d.submitted);
  if (requiredDocs.length > 0) {
    progress += (submittedDocs.length / requiredDocs.length) * 50;
  }

  // Faculty contact (bonus if done)
  if (app.facultyContacts.length > 0) progress += 10;

  // Tests
  if (app.englishTest?.status === TestStatus.Taken) progress += 10;
  if (app.gre?.status === TestStatus.Taken) progress += 10;

  return Math.min(100, Math.round(progress));
};

const ApplicationList: React.FC<ApplicationListProps> = React.memo(({
  applications,
  onEdit,
  onDelete,
  onDeleteUniversity,
  onRenameUniversity,
  onSetUniversityStatus,
  onUpdate,
  onDuplicate,
  hasActiveFilter,
  groupByUniversity = false,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onEnterSelectionMode,
  visibleColumns,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    application: Application;
  } | null>(null);
  const [openStatusKey, setOpenStatusKey] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [collapsedUniversities, setCollapsedUniversities] = useLocalStorage<string[]>('list-collapsed-universities', []);
  const collapsedKeys = Array.isArray(collapsedUniversities) ? collapsedUniversities : [];

  useEffect(() => {
    if (!openStatusKey) return;
    const close = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setOpenStatusKey(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openStatusKey]);

  // Memoized click handlers
  const handleCardClick = useCallback((app: Application) => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(app.id);
    } else {
      onEdit(app);
    }
  }, [isSelectionMode, onToggleSelection, onEdit]);

  const handleLongPress = useCallback((app: Application) => {
    if (!isSelectionMode && onEnterSelectionMode) {
      onEnterSelectionMode();
      if (onToggleSelection) {
        onToggleSelection(app.id);
      }
    }
  }, [isSelectionMode, onEnterSelectionMode, onToggleSelection]);

  const handleContextMenu = useCallback((event: React.MouseEvent, app: Application) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      application: app,
    });
  }, []);

  const handleStatusChange = useCallback((app: Application, status: ApplicationStatus) => {
    onUpdate({ ...app, status });
  }, [onUpdate]);

  const handleCardKeyDown = useCallback((event: React.KeyboardEvent, app: Application) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleCardClick(app);
      return;
    }
    if (!isSelectionMode && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      onDelete(app.id);
    }
  }, [handleCardClick, isSelectionMode, onDelete]);

  const isColumnVisible = useCallback((columnId: string) => {
    return !visibleColumns || visibleColumns.includes(columnId);
  }, [visibleColumns]);

  // Memoize progress calculations for all applications
  const progressMap = useMemo(() => {
    const map = new Map<string, number>();
    applications.forEach(app => {
      map.set(app.id, calculateProgress(app));
    });
    return map;
  }, [applications]);

  const programCountByUniversity = useMemo(() => {
    const counts = new Map<string, number>();
    applications.forEach(app => {
      const key = universityKey(app.universityName);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [applications]);

  const universityGroups = useMemo(() => {
    if (!groupByUniversity) return [];
    const groups = new Map<string, { key: string; name: string; apps: Application[] }>();
    applications.forEach(app => {
      const key = universityKey(app.universityName);
      const existing = groups.get(key);
      if (existing) {
        existing.apps.push(app);
      } else {
        groups.set(key, { key, name: app.universityName, apps: [app] });
      }
    });
    return [...groups.values()];
  }, [applications, groupByUniversity]);

  const [useVirtualScrolling, setUseVirtualScrolling] = useState(applications.length > 50);

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={hasActiveFilter ? "filter_list_off" : "post_add"}
        title={hasActiveFilter ? "No matching applications found" : "No applications yet"}
        message={hasActiveFilter
          ? "Try adjusting your search or filters to find what you're looking for."
          : "Start tracking your academic journey by adding your first application."}
        actionLabel={!hasActiveFilter ? "Add Your First Application" : undefined}
        onAction={!hasActiveFilter ? onEdit.bind(null, null as any) : undefined}
        tips={!hasActiveFilter ? [
          "Use Quick Capture (Ctrl+Shift+C) to quickly add applications",
          "Import existing data from CSV or JSON files",
          "Create templates for common application types"
        ] : [
          "Clear your search query to see all applications",
          "Try different filter combinations",
          "Check if your filters are too restrictive"
        ]}
      />
    );
  }

  const contextMenuNode = contextMenu && (
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      application={contextMenu.application}
      onClose={() => setContextMenu(null)}
      onEdit={onEdit}
      onDelete={onDelete}
      onDeleteUniversity={onDeleteUniversity}
      onRenameUniversity={onRenameUniversity}
      onSetUniversityStatus={onSetUniversityStatus}
      universityProgramCount={programCountByUniversity.get(universityKey(contextMenu.application.universityName)) ?? 1}
      onUpdate={onUpdate}
      onStatusChange={handleStatusChange}
    />
  );

  // Use virtual scrolling for large lists. Grouped universities stay in sections.
  if (useVirtualScrolling && applications.length > 50 && !groupByUniversity) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[#a1a1aa]">
            Virtual scrolling enabled ({applications.length} items)
          </div>
          <button
            onClick={() => setUseVirtualScrolling(false)}
            className="text-sm text-blue-400 hover:underline"
          >
            Disable
          </button>
        </div>
        <VirtualizedList
          items={applications}
          itemHeight={250} // Approximate height of a card
          layout="grid"
          gridGap={24} // gap-6
          minItemWidth={350} // similar to standard card width
          renderItem={(app, index, style) => {
            const isSelected = selectedIds.has(app.id);
            const progress = progressMap.get(app.id) ?? 0;

            return (
              <div
                key={app.id}
                style={style}
                onClick={() => handleCardClick(app)}
                onContextMenu={(e) => handleContextMenu(e, app)}
                onKeyDown={(e) => handleCardKeyDown(e, app)}
                tabIndex={0}
                role="button"
                aria-label={`Application for ${app.universityName}, ${app.programName}`}
                className={`group relative liquid-glass-card rounded-2xl p-5 border-2 shadow-sm cursor-pointer transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#dc2626] ${isSelected
                  ? 'border-[#dc2626] ring-2 ring-[#dc2626]/20'
                  : app.isPinned
                    ? 'border-amber-500/50'
                    : 'border-[#27272a]'
                  }`}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    className="absolute top-4 left-4 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleSelection) onToggleSelection(app.id);
                    }}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                      ? 'bg-red-500 border-red-500 text-white'
                      : 'border-[#3f3f46] bg-[#18181b]'
                      }`}>
                      {isSelected && <MaterialIcon name="check" className="text-sm" />}
                    </div>
                  </div>
                )}

                {/* Pin indicator for pinned cards */}
                {app.isPinned && !isSelectionMode && (
                  <div className="absolute top-4 left-4">
                    <span className="text-amber-400">
                      <MaterialIcon name="push_pin" className="text-lg" />
                    </span>
                  </div>
                )}

                {!isSelectionMode && (
                  <CardActions
                    app={app}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onDuplicate={onDuplicate}
                  />
                )}

                <div className={`mb-4 ${isSelectionMode ? 'pl-8' : 'pr-12'} ${app.isPinned && !isSelectionMode ? 'pl-8' : ''}`}>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isColumnVisible('status') && <StatusBadge status={app.status} />}
                      {/* Tags display (simplified for virtual list performance) */}
                      {isColumnVisible('tags') && app.tags && app.tags.length > 0 && (
                        <span className="text-xs text-[#a1a1aa] border border-[#27272a] rounded-full px-2 py-0.5">
                          {app.tags.length} tag{app.tags.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {isColumnVisible('deadline') && app.deadline && (() => {
                      const info = getDeadlineInfo(app.deadline);
                      return (
                        <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md ${info.colorClass}`}>
                          <MaterialIcon name="schedule" className="text-sm" />
                          {info.label}
                        </span>
                      );
                    })()}
                  </div>
                  {isColumnVisible('universityName') && (
                    <h3 className="text-lg font-bold text-[#f4f4f5] leading-tight mb-1 line-clamp-1" title={app.universityName}>
                      {app.universityName}
                    </h3>
                  )}
                  {isColumnVisible('programName') && (
                    <p className="text-sm text-[#a1a1aa] line-clamp-1" title={app.programName}>
                      {app.programName}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-4 border-t border-[#27272a]">
                  <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                    {isColumnVisible('programType') && <span className="flex items-center gap-1.5">
                      <MaterialIcon name="school" className="text-sm" />
                      {app.programType}
                    </span>}
                    {isColumnVisible('progress') && <span className="flex items-center gap-1.5">
                      {Math.round(progress)}% Complete
                    </span>}
                  </div>

                  {/* Progress Bar */}
                  {isColumnVisible('progress') && <div className="w-full bg-[#27272a] rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-[#dc2626] h-1.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>}
                </div>
              </div>
            );
          }}
        />
        {contextMenuNode}
      </div>
    );
  }

  const sections = groupByUniversity
    ? universityGroups
    : [{ key: 'all', name: '', apps: applications }];

  return (
    <div className="space-y-4">
      {/* Selection mode hint */}
      {!isSelectionMode && applications.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-[#a1a1aa] text-center mb-2"
        >
          <span className="hidden sm:inline">
            Tip: Delete is on each card. Right-click a card to rename a university, set its status, or delete it. Long-press to select.
          </span>
          {groupByUniversity && universityGroups.length > 1 && (
            <button
              type="button"
              onClick={() => {
                const groupKeys = universityGroups.map(group => group.key);
                const allCollapsed = groupKeys.every(key => collapsedKeys.includes(key));
                setCollapsedUniversities(prev => {
                  const current = Array.isArray(prev) ? prev : [];
                  return allCollapsed
                    ? current.filter(key => !groupKeys.includes(key))
                    : [...new Set([...current, ...groupKeys])];
                });
                setOpenStatusKey(null);
              }}
              className="ml-3 text-[#f4f4f5] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#dc2626] rounded"
            >
              {universityGroups.every(group => collapsedKeys.includes(group.key)) ? 'Expand universities' : 'Collapse universities'}
            </button>
          )}
        </motion.div>
      )}

      {sections.map((section) => {
      const displayName = section.name.trim() || 'Untitled university';
      const collapsed = groupByUniversity && collapsedKeys.includes(section.key);
      const statusLabels = [...new Set(section.apps.map(app => STATUS_LABELS[app.status]))];
      const statusSummary = statusLabels.length === 1 ? statusLabels[0] : 'Mixed status';
      return (
      <section key={section.key} className="space-y-4">
      {groupByUniversity && (
        <div className="flex items-start justify-between gap-3 px-1">
          <div className="flex items-start gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setCollapsedUniversities(prev => {
                  const current = Array.isArray(prev) ? prev : [];
                  return current.includes(section.key)
                    ? current.filter(key => key !== section.key)
                    : [...current, section.key];
                });
                setOpenStatusKey(null);
              }}
              className="mt-0.5 p-1 rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] focus:outline-none focus:ring-2 focus:ring-[#dc2626]"
              aria-expanded={!collapsed}
              aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${displayName}`}
            >
              <MaterialIcon name={collapsed ? 'chevron_right' : 'expand_more'} className="text-xl" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#f4f4f5] truncate">{displayName}</h2>
              <p className="text-xs text-[#a1a1aa]">
                {`${section.apps.length} program${section.apps.length === 1 ? '' : 's'} · ${statusSummary}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onRenameUniversity && (
              <button
                type="button"
                onClick={() => onRenameUniversity(section.name)}
                className={headerActionClass}
                aria-label={`Rename ${displayName}`}
              >
                <MaterialIcon name="edit" className="text-base" aria-hidden="true" />
                Rename
              </button>
            )}
            {onSetUniversityStatus && (
              <div className="relative" ref={openStatusKey === section.key ? statusMenuRef : undefined}>
                <button
                  type="button"
                  onClick={() => setOpenStatusKey(current => current === section.key ? null : section.key)}
                  className={headerActionClass}
                  aria-haspopup="menu"
                  aria-expanded={openStatusKey === section.key}
                  aria-label={`Set status for ${displayName}`}
                >
                  <MaterialIcon name="swap_horiz" className="text-base" aria-hidden="true" />
                  Set status
                </button>
                {openStatusKey === section.key && (
                  <div role="menu" className="absolute right-0 top-full z-20 mt-1 w-44 max-h-60 overflow-y-auto liquid-glass-modal-content rounded-lg shadow-xl py-1">
                    {STATUS_OPTIONS.map(status => (
                      <button
                        key={status}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenStatusKey(null);
                          onSetUniversityStatus(section.name, status);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#f4f4f5] hover:bg-[#27272a]"
                      >
                        {STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {onDeleteUniversity && (
              <button
                type="button"
                onClick={() => onDeleteUniversity(section.name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full text-red-300 border border-red-500/30 hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label={`Delete ${displayName}`}
              >
                <MaterialIcon name="delete" className="text-base" aria-hidden="true" />
                Delete university
              </button>
            )}
          </div>
        </div>
      )}
      {!collapsed && <motion.div
        className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        variants={cardContainerVariants}
        initial="hidden"
        animate="visible"
      >
        {section.apps.map((app) => {
          const isSelected = selectedIds.has(app.id);
          const progress = progressMap.get(app.id) ?? 0;

          return (
            <motion.div
              key={app.id}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
              onClick={() => handleCardClick(app)}
              onContextMenu={(e) => handleContextMenu(e, app)}
              onKeyDown={(e) => handleCardKeyDown(e, app)}
              tabIndex={0}
              role="button"
              aria-label={`Application for ${app.universityName}, ${app.programName}`}
              className={`group relative liquid-glass-card rounded-2xl p-5 border-2 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 ${isSelected
                ? 'border-[#dc2626] ring-2 ring-[#dc2626]/20'
                : app.isPinned
                  ? 'border-amber-500/50'
                  : 'border-[#27272a]'
                }`}
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div
                  className="absolute top-4 left-4 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleSelection) onToggleSelection(app.id);
                  }}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                    ? 'bg-[#dc2626] border-[#dc2626] text-white'
                    : 'border-[#27272a] liquid-glass'
                    }`}>
                    {isSelected && <MaterialIcon name="check" className="text-sm" />}
                  </div>
                </div>
              )}

              {/* Pin indicator for pinned cards */}
              {app.isPinned && !isSelectionMode && (
                <div className="absolute top-4 left-4">
                  <span className="text-amber-400">
                    <MaterialIcon name="push_pin" className="text-lg" />
                  </span>
                </div>
              )}

              {!isSelectionMode && (
                <CardActions
                  app={app}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  onDuplicate={onDuplicate}
                />
              )}

              <div className={`mb-4 ${isSelectionMode ? 'pl-8' : 'pr-12'} ${app.isPinned && !isSelectionMode ? 'pl-8' : ''}`}>
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isColumnVisible('status') && <StatusBadge status={app.status} />}
                    {/* Tags display */}
                    {app.tags && app.tags.length > 0 && app.tags.slice(0, 2).map(tag => {
                      const preset = TAG_PRESETS.find(p => p.name === tag);
                      return (
                        <span key={tag} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs ${preset?.bgClass || 'bg-[#27272a] text-[#f4f4f5]'}`}>
                          {preset?.icon && <span className="material-symbols-outlined text-xs">{preset.icon}</span>}
                          {tag}
                        </span>
                      );
                    })}
                    {app.tags && app.tags.length > 2 && (
                      <span className="text-xs text-[#a1a1aa]">+{app.tags.length - 2}</span>
                    )}
                  </div>
                  {isColumnVisible('deadline') && app.deadline && (() => {
                    const info = getDeadlineInfo(app.deadline);
                    return (
                      <span className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md ${info.colorClass}`}>
                        <MaterialIcon name="schedule" className="text-sm" />
                        {info.label}
                      </span>
                    );
                  })()}
                </div>
                {isColumnVisible('universityName') && (
                  <h3 className="text-lg font-bold text-[#f4f4f5] leading-tight mb-1 line-clamp-1" title={app.universityName}>
                    {app.universityName}
                  </h3>
                )}
                {isColumnVisible('programName') && (
                  <p className="text-sm text-[#a1a1aa] line-clamp-1" title={app.programName}>
                    {app.programName}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-[#27272a]">
                <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
                  {isColumnVisible('programType') && <span className="flex items-center gap-1.5">
                    <MaterialIcon name="school" className="text-sm" />
                    {app.programType}
                  </span>}
                  {isColumnVisible('applicationFee') && app.applicationFee > 0 && (
                    <span className="flex items-center gap-1.5">
                      <MaterialIcon name="payments" className="text-sm" />
                      ${app.applicationFee}
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {isColumnVisible('progress') && <div className="w-full bg-[#27272a] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="bg-[#dc2626] h-1.5 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>}
      </section>
      );
      })}
      {contextMenuNode}
    </div>
  );
});

export default ApplicationList;
