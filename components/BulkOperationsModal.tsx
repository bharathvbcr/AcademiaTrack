import React, { useState } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Application, ApplicationStatus, DocumentStatus, ApplicationFeeWaiverStatus, ProgramType, FinancialOffer } from '../types';
import { STATUS_OPTIONS, DOCUMENT_STATUS_OPTIONS, FEE_WAIVER_STATUS_OPTIONS, TAG_PRESETS, PROGRAM_TYPE_OPTIONS, ADMISSION_TERM_OPTIONS } from '../constants';
import { useCustomFields } from '../hooks/useCustomFields';

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
  const [activeTab, setActiveTab] = useState<'status' | 'fields' | 'documents' | 'tags' | 'dates' | 'recommenders' | 'ranking' | 'location' | 'program' | 'custom' | 'reminders' | 'faculty' | 'financial'>('status');
  const [updates, setUpdates] = useState<Omit<Partial<Application>, 'documents'> & { documents?: Partial<Application['documents']> }>({});

  // Date shifting state
  const [dateShifts, setDateShifts] = useState<DateShift[]>([]);

  // Recommender state
  const [recommenderToAdd, setRecommenderToAdd] = useState<RecommenderToAdd>({ name: '', email: '', title: '', relationship: '' });
  const [addRecommenderEnabled, setAddRecommenderEnabled] = useState(false);

  // Custom fields state
  const [customFieldUpdates, setCustomFieldUpdates] = useState<Record<string, string | number | boolean>>({});
  const { customFields } = useCustomFields();

  // Reminder state
  const [reminderToAdd, setReminderToAdd] = useState({ text: '', date: '', daysOffset: 0 });
  const [addReminderEnabled, setAddReminderEnabled] = useState(false);

  // Faculty contact state
  const [facultyToAdd, setFacultyToAdd] = useState({ name: '', email: '', researchArea: '' });
  const [addFacultyEnabled, setAddFacultyEnabled] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    // Check if we have standard updates
    const hasStandardUpdates = Object.keys(updates).length > 0;
    const hasDateShifts = dateShifts.length > 0;
    const hasRecommenderAdd = addRecommenderEnabled && recommenderToAdd.name;
    const hasCustomFields = Object.keys(customFieldUpdates).length > 0;
    const hasReminderAdd = addReminderEnabled && reminderToAdd.text;
    const hasFacultyAdd = addFacultyEnabled && facultyToAdd.name;

    if (hasDateShifts || hasRecommenderAdd || hasCustomFields || hasReminderAdd || hasFacultyAdd) {
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

        // Apply Custom Fields
        if (hasCustomFields) {
          newUpdates.customFields = {
            ...(app.customFields || {}),
            ...customFieldUpdates,
          };
        }

        // Apply Reminder Addition
        if (hasReminderAdd) {
          const reminderDate = new Date();
          if (reminderToAdd.date) {
            reminderDate.setTime(new Date(reminderToAdd.date).getTime());
          } else if (reminderToAdd.daysOffset !== 0) {
            reminderDate.setDate(reminderDate.getDate() + reminderToAdd.daysOffset);
          }
          const newReminder = {
            id: crypto.randomUUID(),
            text: reminderToAdd.text,
            date: reminderDate.toISOString(),
            completed: false,
          };
          newUpdates.reminders = [...(app.reminders || []), newReminder];
        }

        // Apply Faculty Contact Addition
        if (hasFacultyAdd) {
          const newFaculty = {
            id: crypto.randomUUID(),
            name: facultyToAdd.name,
            email: facultyToAdd.email,
            website: '',
            researchArea: facultyToAdd.researchArea,
            contactStatus: 'Not Contacted',
            contactDate: null,
            interviewDate: null,
          };
          newUpdates.facultyContacts = [...(app.facultyContacts || []), newFaculty];
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
    setCustomFieldUpdates({});
    setAddReminderEnabled(false);
    setReminderToAdd({ text: '', date: '', daysOffset: 0 });
    setAddFacultyEnabled(false);
    setFacultyToAdd({ name: '', email: '', researchArea: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center liquid-glass-modal">
      <div className="liquid-glass-modal-content rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#E8B4B8]/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#F5D7DA]">Bulk Operations</h2>
              <p className="text-sm text-[#E8B4B8]/70 mt-1">
                Updating {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[rgba(192,48,80,0.25)] rounded-lg text-[#E8B4B8] hover:text-[#F5D7DA]"
              aria-label="Close bulk operations modal"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E8B4B8]/30 overflow-x-auto">
          {(['status', 'fields', 'documents', 'tags', 'dates', 'recommenders', 'ranking', 'location', 'program', 'custom', 'reminders', 'faculty', 'financial'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-xs capitalize transition-colors whitespace-nowrap ${activeTab === tab
                ? 'text-[#C03050] border-b-2 border-[#C03050]'
                : 'text-[#E8B4B8] hover:text-[#F5D7DA]'
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
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Status</span>
                <select
                  value={(updates.status as ApplicationStatus) || ''}
                  onChange={(e) => setUpdates({ ...updates, status: e.target.value as ApplicationStatus })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA]"
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
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Application Fee</span>
                <input
                  type="number"
                  value={updates.applicationFee ?? ''}
                  onChange={(e) => setUpdates({ ...updates, applicationFee: Number(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                  placeholder="Leave empty for no change"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Fee Waiver Status</span>
                <select
                  value={updates.feeWaiverStatus || ''}
                  onChange={(e) => setUpdates({ ...updates, feeWaiverStatus: e.target.value as ApplicationFeeWaiverStatus })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA]"
                >
                  <option value="">-- No change --</option>
                  {FEE_WAIVER_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Admission Chance (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={updates.admissionChance ?? ''}
                  onChange={(e) => setUpdates({ ...updates, admissionChance: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                  placeholder="0-100"
                />
              </label>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Document Type</span>
                <select
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] mb-4"
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
                        className="px-3 py-1.5 border border-[#E8B4B8]/30 rounded-lg text-sm liquid-glass text-[#F5D7DA]"
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
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Add Tags</span>
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
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Remove Tags</span>
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
                        title={`Decrease ${field.replace(/([A-Z])/g, ' $1').trim()} by 1 day`}
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
                        title={`Increase ${field.replace(/([A-Z])/g, ' $1').trim()} by 1 day`}
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
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={recommenderToAdd.email}
                      onChange={e => setRecommenderToAdd({ ...recommenderToAdd, email: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        placeholder="Title (e.g. Professor)"
                        value={recommenderToAdd.title}
                        onChange={e => setRecommenderToAdd({ ...recommenderToAdd, title: e.target.value })}
                        className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                      />
                      <input
                        placeholder="Relationship"
                        value={recommenderToAdd.relationship}
                        onChange={e => setRecommenderToAdd({ ...recommenderToAdd, relationship: e.target.value })}
                        className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ranking' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">University Ranking</span>
                <input
                  type="text"
                  value={updates.universityRanking || ''}
                  onChange={(e) => setUpdates({ ...updates, universityRanking: e.target.value })}
                  placeholder="e.g., 1-10, 11-20"
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Department Ranking</span>
                <input
                  type="text"
                  value={updates.departmentRanking || ''}
                  onChange={(e) => setUpdates({ ...updates, departmentRanking: e.target.value })}
                  placeholder="e.g., 1-10, 11-20"
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                />
              </label>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Location</span>
                <input
                  type="text"
                  value={updates.location || ''}
                  onChange={(e) => setUpdates({ ...updates, location: e.target.value })}
                  placeholder="e.g., Cambridge, MA, USA"
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                />
              </label>
            </div>
          )}

          {activeTab === 'program' && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Program Type</span>
                <select
                  value={updates.programType || ''}
                  onChange={(e) => setUpdates({ ...updates, programType: e.target.value as ProgramType })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                >
                  <option value="">-- No change --</option>
                  {PROGRAM_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Admission Term</span>
                <select
                  value={updates.admissionTerm || ''}
                  onChange={(e) => setUpdates({ ...updates, admissionTerm: e.target.value as any })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                >
                  <option value="">-- No change --</option>
                  {ADMISSION_TERM_OPTIONS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Admission Year</span>
                <input
                  type="text"
                  value={updates.admissionYear || ''}
                  onChange={(e) => setUpdates({ ...updates, admissionYear: e.target.value })}
                  placeholder="e.g., 2024"
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                />
              </label>
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Update custom fields for all selected applications.</p>
              </div>
              {customFields.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No custom fields defined. Create them in Settings.</p>
              ) : (
                <div className="space-y-4">
                  {customFields.map(field => (
                    <label key={field.id} className="block">
                      <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">{field.name}</span>
                      {field.type === 'text' && (
                        <input
                          type="text"
                          value={(customFieldUpdates[field.id] as string) || ''}
                          onChange={(e) => setCustomFieldUpdates({ ...customFieldUpdates, [field.id]: e.target.value })}
                          className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                        />
                      )}
                      {field.type === 'number' && (
                        <input
                          type="number"
                          value={(customFieldUpdates[field.id] as number) || ''}
                          onChange={(e) => setCustomFieldUpdates({ ...customFieldUpdates, [field.id]: parseFloat(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                        />
                      )}
                      {field.type === 'boolean' && (
                        <select
                          value={customFieldUpdates[field.id] === undefined ? '' : String(customFieldUpdates[field.id])}
                          onChange={(e) => setCustomFieldUpdates({ ...customFieldUpdates, [field.id]: e.target.value === 'true' })}
                          className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                        >
                          <option value="">-- No change --</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Add a reminder to all selected applications.</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={addReminderEnabled}
                    onChange={(e) => setAddReminderEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Add Reminder</span>
                </label>
                {addReminderEnabled && (
                  <div className="grid grid-cols-1 gap-4 pl-7 animate-fadeIn">
                    <input
                      placeholder="Reminder text"
                      value={reminderToAdd.text}
                      onChange={e => setReminderToAdd({ ...reminderToAdd, text: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="date"
                        value={reminderToAdd.date}
                        onChange={e => setReminderToAdd({ ...reminderToAdd, date: e.target.value, daysOffset: 0 })}
                        placeholder="Specific date"
                        className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                      />
                      <input
                        type="number"
                        value={reminderToAdd.daysOffset || ''}
                        onChange={e => setReminderToAdd({ ...reminderToAdd, daysOffset: parseInt(e.target.value) || 0, date: '' })}
                        placeholder="Days from today"
                        className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Update financial information for all selected applications.</p>
              </div>
              
              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Application Fee</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={updates.applicationFee ?? ''}
                  onChange={(e) => setUpdates({ ...updates, applicationFee: Number(e.target.value) || undefined })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                  placeholder="e.g., 75.00"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#F5D7DA] mb-2 block">Fee Waiver Status</span>
                <select
                  value={updates.feeWaiverStatus || ''}
                  onChange={(e) => setUpdates({ ...updates, feeWaiverStatus: e.target.value as ApplicationFeeWaiverStatus })}
                  className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                >
                  <option value="">-- No change --</option>
                  {FEE_WAIVER_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Financial Offer</h4>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={updates.financialOffer?.received ?? false}
                      onChange={(e) => setUpdates({
                        ...updates,
                        financialOffer: {
                          ...updates.financialOffer,
                          received: e.target.checked,
                        } as FinancialOffer,
                      })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Received Financial Offer</span>
                  </label>

                  {updates.financialOffer?.received && (
                    <div className="grid grid-cols-2 gap-4 pl-7">
                      <label className="block">
                        <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Stipend Amount</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={updates.financialOffer?.stipendAmount ?? ''}
                          onChange={(e) => setUpdates({
                            ...updates,
                            financialOffer: {
                              ...updates.financialOffer,
                              stipendAmount: Number(e.target.value) || 0,
                            } as FinancialOffer,
                          })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                          placeholder="0.00"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Tuition Waiver (%)</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={updates.financialOffer?.tuitionWaiver ?? ''}
                          onChange={(e) => setUpdates({
                            ...updates,
                            financialOffer: {
                              ...updates.financialOffer,
                              tuitionWaiver: Number(e.target.value) || 0,
                            } as FinancialOffer,
                          })}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                          placeholder="0-100"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'faculty' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                <p>Add a faculty contact to all selected applications.</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={addFacultyEnabled}
                    onChange={(e) => setAddFacultyEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Add Faculty Contact</span>
                </label>
                {addFacultyEnabled && (
                  <div className="grid grid-cols-1 gap-4 pl-7 animate-fadeIn">
                    <input
                      placeholder="Faculty Name"
                      value={facultyToAdd.name}
                      onChange={e => setFacultyToAdd({ ...facultyToAdd, name: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={facultyToAdd.email}
                      onChange={e => setFacultyToAdd({ ...facultyToAdd, email: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                    <input
                      placeholder="Research Area"
                      value={facultyToAdd.researchArea}
                      onChange={e => setFacultyToAdd({ ...facultyToAdd, researchArea: e.target.value })}
                      className="w-full px-4 py-2 border border-[#E8B4B8]/30 rounded-lg liquid-glass text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E8B4B8]/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E8B4B8]/30 rounded-lg hover:bg-[rgba(192,48,80,0.25)] text-[#F5D7DA]"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={Object.keys(updates).length === 0 && dateShifts.length === 0 && (!addRecommenderEnabled || !recommenderToAdd.name) && !addReminderEnabled && !addFacultyEnabled && Object.keys(customFieldUpdates).length === 0}
            className="px-4 py-2 bg-[#C03050] text-white rounded-lg hover:bg-[#E03030] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply to {selectedApplications.length} Application{selectedApplications.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsModal;
