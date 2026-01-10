import React, { useState } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useModalKeyboardShortcuts } from '../hooks/useModalKeyboardShortcuts';
import { Application, ApplicationStatus, DocumentStatus, ApplicationFeeWaiverStatus } from '../types';
import { STATUS_OPTIONS, DOCUMENT_STATUS_OPTIONS, FEE_WAIVER_STATUS_OPTIONS, TAG_PRESETS } from '../constants';

// Extended type that allows partial documents for bulk updates
type BulkUpdates = Omit<Partial<Application>, 'documents'> & {
  documents?: Partial<Application['documents']>;
} | ((app: Application) => Partial<Application>);

interface DateShift {
  field: 'deadline' | 'preferredDeadline' | 'decisionDeadline';
  days: number;
}

interface RecommenderToAdd {
  name: string;
  email: string;
  title: string;
  relationship: string;
}

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: Application[];
  onUpdate: (updates: Partial<Application> | ((app: Application) => Partial<Application>), ids: string[]) => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedApplications,
  onUpdate,
}) => {
  useLockBodyScroll(isOpen);
  const [activeTab, setActiveTab] = useState<'status' | 'fields' | 'documents' | 'tags' | 'dates' | 'recommenders'>('status');
  const [updates, setUpdates] = useState<Omit<Partial<Application>, 'documents'> & { documents?: Partial<Application['documents']> }>({});

  // Date shifting state
  const [dateShifts, setDateShifts] = useState<DateShift[]>([]);

  // Recommender state
  const [recommenderToAdd, setRecommenderToAdd] = useState<RecommenderToAdd>({ name: '', email: '', title: '', relationship: '' });
  const [addRecommenderEnabled, setAddRecommenderEnabled] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    // Check if we have standard updates
    const hasStandardUpdates = Object.keys(updates).length > 0;
    const hasDateShifts = dateShifts.length > 0;
    const hasRecommenderAdd = addRecommenderEnabled && recommenderToAdd.name;

    if (hasDateShifts || hasRecommenderAdd) {
      // Functional update
      onUpdate((app: Application) => {
        const newUpdates: any = { ...updates };

        // Apply Date Shifts
        if (hasDateShifts) {
          dateShifts.forEach(shift => {
            const currentValue = app[shift.field];
            if (currentValue) {
              const date = new Date(currentValue);
              if (!isNaN(date.getTime())) {
                date.setDate(date.getDate() + shift.days);
                newUpdates[shift.field] = date.toISOString();
              }
            }
          });
        }

        // Apply Recommender Addition
        if (hasRecommenderAdd) {
          const newRecommender = {
            id: crypto.randomUUID(),
            ...recommenderToAdd,
            status: 'Not Started',
            dateRequested: null,
            dateSubmitted: null,
            notes: 'Added via Bulk Operations'
          };
          newUpdates.recommenders = [...(app.recommenders || []), newRecommender];
        }

        return newUpdates;
      }, selectedApplications.map(app => app.id));
    } else if (hasStandardUpdates) {
      onUpdate(updates as Partial<Application>, selectedApplications.map(app => app.id));
    }

    setUpdates({});
    setDateShifts([]);
    setAddRecommenderEnabled(false);
    setRecommenderToAdd({ name: '', email: '', title: '', relationship: '' });
    onClose();
  };

  // Keyboard shortcuts
  useModalKeyboardShortcuts({
    onSaveAndClose: handleApply,
    onClose,
    enabled: isOpen,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bulk Operations</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Updating {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Close bulk operations modal"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
          {(['status', 'fields', 'documents', 'tags', 'dates', 'recommenders'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm capitalize transition-colors ${activeTab === tab
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Status</span>
                <select
                  value={(updates.status as ApplicationStatus) || ''}
                  onChange={(e) => setUpdates({ ...updates, status: e.target.value as ApplicationStatus })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="">-- No change --</option>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Application Fee</span>
                <input
                  type="number"
                  value={updates.applicationFee ?? ''}
                  onChange={(e) => setUpdates({ ...updates, applicationFee: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder="Leave empty for no change"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Fee Waiver Status</span>
                <select
                  value={updates.feeWaiverStatus || ''}
                  onChange={(e) => setUpdates({ ...updates, feeWaiverStatus: e.target.value as ApplicationFeeWaiverStatus })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                >
                  <option value="">-- No change --</option>
                  {FEE_WAIVER_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Admission Chance (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={updates.admissionChance ?? ''}
                  onChange={(e) => setUpdates({ ...updates, admissionChance: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder="0-100"
                />
              </label>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Document Type</span>
                <select
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 mb-4"
                  onChange={(e) => {
                    const docType = e.target.value as keyof Application['documents'];
                    if (docType) {
                      const currentDoc = updates.documents?.[docType] || selectedApplications[0]?.documents[docType];
                      setUpdates({
                        ...updates,
                        documents: {
                          ...updates.documents,
                          [docType]: {
                            ...currentDoc,
                            status: DocumentStatus.NotStarted,
                          },
                        } as Partial<Application['documents']>,
                      });
                    }
                  }}
                >
                  <option value="">Select document type</option>
                  <option value="cv">CV / Resume</option>
                  <option value="statementOfPurpose">Statement of Purpose</option>
                  <option value="transcripts">Transcripts</option>
                  <option value="lor1">Letter of Recommendation #1</option>
                  <option value="lor2">Letter of Recommendation #2</option>
                  <option value="lor3">Letter of Recommendation #3</option>
                  <option value="writingSample">Writing Sample</option>
                </select>
              </label>

              {updates.documents && Object.keys(updates.documents).length > 0 && (
                <div className="space-y-2">
                  {Object.entries(updates.documents).map(([docType, doc]) => (
                    <div key={docType} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <span className="flex-1 text-sm font-medium capitalize">{docType.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <select
                        value={doc?.status || DocumentStatus.NotStarted}
                        onChange={(e) => {
                          setUpdates({
                            ...updates,
                            documents: {
                              ...updates.documents,
                              [docType]: {
                                ...doc,
                                status: e.target.value as DocumentStatus,
                              },
                            } as Partial<Application['documents']>,
                          });
                        }}
                        className="px-3 py-1.5 border rounded-lg text-sm"
                        aria-label={`Document status for ${docType.replace(/([A-Z])/g, ' $1').trim()}`}
                      >
                        {DOCUMENT_STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Add Tags</span>
                <div className="flex flex-wrap gap-2">
                  {TAG_PRESETS.map(tag => {
                    const currentTags = updates.tags || [];
                    const isSelected = currentTags.includes(tag.name);
                    return (
                      <button
                        key={tag.name}
                        onClick={() => {
                          const newTags = isSelected
                            ? currentTags.filter(t => t !== tag.name)
                            : [...currentTags, tag.name];
                          setUpdates({ ...updates, tags: newTags });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${isSelected
                          ? tag.bgClass + ' ring-2 ring-offset-1 ring-current'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                          }`}
                      >
                        {tag.icon && <MaterialIcon name={tag.icon} className="text-xs inline mr-1" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Remove Tags</span>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(selectedApplications.flatMap(app => app.tags || []))).map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        const currentTags = updates.tags || [];
                        // For removal, we'll mark with a special prefix
                        const removeTags = updates.tags?.filter(t => t.startsWith('__remove__')) || [];
                        if (!removeTags.includes(`__remove__${tag}`)) {
                          setUpdates({
                            ...updates,
                            tags: [...currentTags, `__remove__${tag}`],
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-sm hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      <MaterialIcon name="close" className="text-xs inline mr-1" />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dates' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Shift deadlines for all selected applications relative to their current dates.</p>
              </div>

              {(['deadline', 'preferredDeadline', 'decisionDeadline'] as const).map(field => {
                const shift = dateShifts.find(s => s.field === field);
                const days = shift?.days || 0;

                return (
                  <div key={field} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const newDays = days - 1;
                          const newShifts = dateShifts.filter(s => s.field !== field);
                          if (newDays !== 0) newShifts.push({ field, days: newDays });
                          setDateShifts(newShifts);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        aria-label={`Decrease ${field.replace(/([A-Z])/g, ' $1').trim()} by 1 day`}
                      >
                        <MaterialIcon name="remove" className="text-sm" />
                      </button>
                      <span className={`w-16 text-center font-mono ${days !== 0 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}`}>
                        {days > 0 ? '+' : ''}{days} days
                      </span>
                      <button
                        onClick={() => {
                          const newDays = days + 1;
                          const newShifts = dateShifts.filter(s => s.field !== field);
                          if (newDays !== 0) newShifts.push({ field, days: newDays });
                          setDateShifts(newShifts);
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                        aria-label={`Increase ${field.replace(/([A-Z])/g, ' $1').trim()} by 1 day`}
                      >
                        <MaterialIcon name="add" className="text-sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'recommenders' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Add a new recommender to all selected applications.</p>
              </div>

              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={addRecommenderEnabled}
                    onChange={(e) => setAddRecommenderEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Add Recommender</span>
                </label>

                {addRecommenderEnabled && (
                  <div className="grid grid-cols-1 gap-4 pl-7 animate-fadeIn">
                    <input
                      placeholder="Full Name"
                      value={recommenderToAdd.name}
                      onChange={e => setRecommenderToAdd({ ...recommenderToAdd, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={recommenderToAdd.email}
                      onChange={e => setRecommenderToAdd({ ...recommenderToAdd, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        placeholder="Title (e.g. Professor)"
                        value={recommenderToAdd.title}
                        onChange={e => setRecommenderToAdd({ ...recommenderToAdd, title: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                      />
                      <input
                        placeholder="Relationship"
                        value={recommenderToAdd.relationship}
                        onChange={e => setRecommenderToAdd({ ...recommenderToAdd, relationship: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={Object.keys(updates).length === 0 && dateShifts.length === 0 && (!addRecommenderEnabled || !recommenderToAdd.name)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to {selectedApplications.length} Application{selectedApplications.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsModal;
