import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useViewState, ViewMode } from '../hooks/useViewState';
import { ToggleSwitch, MaterialIcon, formPrimaryBtnClass, formSecondaryBtnClass, formIconBtnClass, formCardClass, formMutedTextClass } from './ApplicationFormUI';

interface ColumnConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewMode;
}

// Available columns for list view
const AVAILABLE_COLUMNS = [
  { id: 'universityName', label: 'University Name', icon: 'school', defaultVisible: true },
  { id: 'programName', label: 'Program Name', icon: 'book', defaultVisible: true },
  { id: 'programType', label: 'Program Type', icon: 'category', defaultVisible: true },
  { id: 'department', label: 'Department', icon: 'domain', defaultVisible: true },
  { id: 'location', label: 'Location', icon: 'location_on', defaultVisible: true },
  { id: 'status', label: 'Status', icon: 'flag', defaultVisible: true },
  { id: 'deadline', label: 'Deadline', icon: 'schedule', defaultVisible: true },
  { id: 'applicationFee', label: 'Application Fee', icon: 'payments', defaultVisible: true },
  { id: 'universityRanking', label: 'University Ranking', icon: 'star', defaultVisible: false },
  { id: 'departmentRanking', label: 'Department Ranking', icon: 'star', defaultVisible: false },
  { id: 'admissionChance', label: 'Admission Chance', icon: 'percent', defaultVisible: false },
  { id: 'tags', label: 'Tags', icon: 'label', defaultVisible: true },
  { id: 'progress', label: 'Progress', icon: 'trending_up', defaultVisible: true },
];

const ColumnConfigModal: React.FC<ColumnConfigModalProps> = ({ isOpen, onClose, viewMode }) => {
  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);
  const { getViewState, saveViewState } = useViewState(viewMode);
  const viewState = getViewState();
  
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    viewState?.visibleColumns || AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id)
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    viewState?.columnOrder || AVAILABLE_COLUMNS.map(c => c.id)
  );

  const handleToggleColumn = (columnId: string) => {
    setVisibleColumns(prev => 
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const index = prev.indexOf(columnId);
      if (index === -1) return prev;
      
      const newOrder = [...prev];
      if (direction === 'up' && index > 0) {
        [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
      } else if (direction === 'down' && index < newOrder.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      }
      return newOrder;
    });
  };

  const handleSave = () => {
    saveViewState({
      visibleColumns,
      columnOrder,
    });
    onClose();
  };

  const handleReset = () => {
    const defaultVisible = AVAILABLE_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
    const defaultOrder = AVAILABLE_COLUMNS.map(c => c.id);
    setVisibleColumns(defaultVisible);
    setColumnOrder(defaultOrder);
  };

  // Sort columns by current order
  const sortedColumns = useMemo(() => {
    return AVAILABLE_COLUMNS.sort((a, b) => {
      const indexA = columnOrder.indexOf(a.id);
      const indexB = columnOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [columnOrder]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          onClick={onClose}
          className="fixed inset-0 liquid-glass-modal"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        />

        <motion.div
          className="relative liquid-glass-modal-content rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f4f4f5]">Column Configuration</h2>
              <button
                onClick={onClose}
                className={formIconBtnClass}
                aria-label="Close column configuration modal"
              >
                <MaterialIcon name="close" className="text-xl" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <p className={`text-sm ${formMutedTextClass}`}>
              Configure which columns are visible and their display order.
            </p>

            <div className="space-y-2">
              {sortedColumns.map((column, index) => {
                const isVisible = visibleColumns.includes(column.id);
                const canMoveUp = index > 0;
                const canMoveDown = index < sortedColumns.length - 1;

                return (
                  <div
                    key={column.id}
                    className={`flex items-center gap-3 p-3 ${formCardClass}`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleMoveColumn(column.id, 'up')}
                          disabled={!canMoveUp}
                          className="p-1 text-[#a1a1aa] hover:text-[#f4f4f5] disabled:opacity-30"
                          aria-label={`Move ${column.label} up`}
                          title="Move up"
                        >
                          <MaterialIcon name="arrow_upward" className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleMoveColumn(column.id, 'down')}
                          disabled={!canMoveDown}
                          className="p-1 text-[#a1a1aa] hover:text-[#f4f4f5] disabled:opacity-30"
                          aria-label={`Move ${column.label} down`}
                          title="Move down"
                        >
                          <MaterialIcon name="arrow_downward" className="text-sm" />
                        </button>
                      </div>
                      <MaterialIcon name={column.icon} className="text-[#a1a1aa]" />
                      <span className="font-medium text-[#f4f4f5]">{column.label}</span>
                    </div>
                    <ToggleSwitch
                      checked={isVisible}
                      onChange={() => handleToggleColumn(column.id)}
                      aria-label={`Toggle visibility for ${column.label}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-[#27272a] flex items-center justify-between">
            <button
              onClick={handleReset}
              className={formSecondaryBtnClass}
            >
              Reset to Defaults
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className={formSecondaryBtnClass}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={formPrimaryBtnClass}
              >
                Save
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ColumnConfigModal;
