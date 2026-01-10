import React, { useState, useMemo } from 'react';
import { WorkflowRule, WorkflowTrigger, WorkflowAction, TRIGGER_TYPES, ACTION_TYPES } from '../types/workflow';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';

interface WorkflowRuleBuilderProps {
  rule?: WorkflowRule;
  onSave: (rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>) => void;
  onCancel: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const WorkflowRuleBuilder: React.FC<WorkflowRuleBuilderProps> = ({ rule, onSave, onCancel }) => {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [triggerType, setTriggerType] = useState<WorkflowTrigger['type']>(rule?.trigger.type || 'status_changed');
  const [triggerConditions, setTriggerConditions] = useState(rule?.trigger.conditions || {});
  const [actions, setActions] = useState<WorkflowAction[]>(rule?.actions || []);

  const selectedTrigger = useMemo(() => TRIGGER_TYPES.find(t => t.value === triggerType), [triggerType]);

  const handleAddAction = () => {
    setActions(prev => [...prev, { type: 'create_reminder', params: {} }]);
  };

  const handleUpdateAction = (index: number, updates: Partial<WorkflowAction>) => {
    setActions(prev => prev.map((action, i) => i === index ? { ...action, ...updates } : action));
  };

  const handleRemoveAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (actions.length === 0) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      trigger: {
        type: triggerType,
        conditions: Object.keys(triggerConditions).length > 0 ? triggerConditions : undefined,
      },
      actions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div>
        <label className="block text-sm font-medium mb-2">Rule Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
          placeholder="e.g., Auto-remind before deadline"
          aria-label="Rule name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
          rows={2}
          placeholder="Optional description"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="enabled" className="text-sm">Enabled</label>
      </div>

      {/* Trigger */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <h3 className="text-lg font-semibold mb-4">Trigger</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Trigger Type *</label>
          <select
            value={triggerType}
            onChange={(e) => {
              setTriggerType(e.target.value as WorkflowTrigger['type']);
              setTriggerConditions({});
            }}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
            aria-label="Trigger Type"
            title="Select the trigger type for this workflow rule"
          >
            {TRIGGER_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>

        {/* Trigger Conditions */}
        {triggerType === 'status_changed' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">From Status</label>
              <select
                value={triggerConditions.fromStatus || ''}
                onChange={(e) => setTriggerConditions(prev => ({ ...prev, fromStatus: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                aria-label="From Status"
                title="Select the status the application is changing from"
              >
                <option value="">Any Status</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To Status</label>
              <select
                value={triggerConditions.toStatus || ''}
                onChange={(e) => setTriggerConditions(prev => ({ ...prev, toStatus: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                aria-label="To Status"
                title="Select the status the application is changing to"
              >
                <option value="">Any Status</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {triggerType === 'deadline_approaching' && (
          <div>
            <label className="block text-sm font-medium mb-2">Days Before Deadline</label>
            <input
              type="number"
              min="1"
              value={triggerConditions.daysBefore || ''}
              onChange={(e) => setTriggerConditions(prev => ({ ...prev, daysBefore: parseInt(e.target.value) || undefined }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              placeholder="e.g., 7"
              aria-label="Days before deadline"
            />
          </div>
        )}

        {triggerType === 'document_submitted' && (
          <div>
            <label className="block text-sm font-medium mb-2">Document Type</label>
            <select
              value={triggerConditions.documentType || ''}
              onChange={(e) => setTriggerConditions(prev => ({ ...prev, documentType: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              aria-label="Document Type"
              title="Select the document type that triggers this rule"
            >
              <option value="">Select document...</option>
              <option value="cv">CV</option>
              <option value="statementOfPurpose">Statement of Purpose</option>
              <option value="transcripts">Transcripts</option>
              <option value="lor1">Letter of Recommendation 1</option>
              <option value="lor2">Letter of Recommendation 2</option>
              <option value="lor3">Letter of Recommendation 3</option>
              <option value="writingSample">Writing Sample</option>
            </select>
          </div>
        )}

        {triggerType === 'field_updated' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2">Field Name</label>
              <input
                type="text"
                value={triggerConditions.fieldName || ''}
                onChange={(e) => setTriggerConditions(prev => ({ ...prev, fieldName: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                placeholder="e.g., applicationFee"
                aria-label="Field name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Field Value (optional)</label>
              <input
                type="text"
                value={triggerConditions.fieldValue || ''}
                onChange={(e) => setTriggerConditions(prev => ({ ...prev, fieldValue: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                placeholder="Trigger only when value equals this"
                aria-label="Field value"
              />
            </div>
          </div>
        )}

        {triggerType === 'tag_added' && (
          <div>
            <label className="block text-sm font-medium mb-2">Tag Name</label>
            <input
              type="text"
              value={triggerConditions.tagName || ''}
              onChange={(e) => setTriggerConditions(prev => ({ ...prev, tagName: e.target.value || undefined }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              placeholder="e.g., priority"
              aria-label="Tag name"
            />
          </div>
        )}

        {triggerType === 'days_before_deadline' && (
          <div>
            <label className="block text-sm font-medium mb-2">Days Before Deadline</label>
            <input
              type="number"
              min="1"
              value={triggerConditions.daysBefore || ''}
              onChange={(e) => setTriggerConditions(prev => ({ ...prev, daysBefore: parseInt(e.target.value) || undefined }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              aria-label="Days before deadline"
              placeholder="e.g., 3"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Actions</h3>
          <button
            onClick={handleAddAction}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <MaterialIcon name="add" className="text-sm" />
            Add Action
          </button>
        </div>

        {actions.length === 0 && (
          <div className="text-sm text-slate-500 dark:text-slate-400 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
            No actions defined. Add at least one action for this rule to work.
          </div>
        )}

        <div className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Action {index + 1}</span>
                <button
                  onClick={() => handleRemoveAction(index)}
                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  aria-label={`Remove action ${index + 1}`}
                  title={`Remove action ${index + 1}`}
                >
                  <MaterialIcon name="delete" className="text-sm" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Action Type</label>
                  <select
                    value={action.type}
                    onChange={(e) => handleUpdateAction(index, { type: e.target.value as WorkflowAction['type'], params: {} })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                    aria-label="Action Type"
                    title="Select the action type for this workflow rule"
                  >
                    {ACTION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} - {type.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Parameters */}
                {action.type === 'create_reminder' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Reminder Text</label>
                      <input
                        type="text"
                        value={action.params?.reminderText || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, reminderText: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        placeholder="e.g., Submit final documents"
                        aria-label="Reminder Text"
                        title="Enter the reminder text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Reminder Date (optional)</label>
                      <input
                        type="date"
                        value={action.params?.reminderDate || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, reminderDate: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        aria-label="Reminder Date"
                        title="Select the date for the reminder"
                      />
                    </div>
                  </div>
                )}

                {action.type === 'update_field' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Field Name</label>
                      <input
                        type="text"
                        value={action.params?.fieldName || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, fieldName: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        placeholder="e.g., applicationFee"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Field Value</label>
                      <input
                        type="text"
                        value={action.params?.fieldValue || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, fieldValue: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        placeholder="New value"
                      />
                    </div>
                  </div>
                )}

                {action.type === 'change_status' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">New Status</label>
                    <select
                      value={action.params?.status || ''}
                      onChange={(e) => handleUpdateAction(index, { params: { ...action.params, status: e.target.value } })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                      aria-label="New Status"
                      title="Select the new status to set"
                    >
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                )}

                {(action.type === 'add_tag' || action.type === 'remove_tag') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Tag Name</label>
                    <input
                      type="text"
                      value={action.params?.tagName || ''}
                      onChange={(e) => handleUpdateAction(index, { params: { ...action.params, tagName: e.target.value } })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                      placeholder="e.g., priority"
                      aria-label="Tag name"
                    />
                  </div>
                )}

                {action.type === 'send_notification' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Notification Title</label>
                      <input
                        type="text"
                        value={action.params?.notificationTitle || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, notificationTitle: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        placeholder="e.g., Deadline Reminder"
                        aria-label="Notification title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Notification Message</label>
                      <textarea
                        value={action.params?.notificationMessage || ''}
                        onChange={(e) => handleUpdateAction(index, { params: { ...action.params, notificationMessage: e.target.value } })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                        rows={2}
                        placeholder="e.g., Application deadline is approaching"
                        aria-label="Notification Message"
                        title="Enter the notification message"
                      />
                    </div>
                  </div>
                )}

                {action.type === 'set_deadline' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Deadline</label>
                                          <input
                                            type="date"
                                            value={action.params?.deadline || ''}
                                            onChange={(e) => handleUpdateAction(index, { params: { ...action.params, deadline: e.target.value } })}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                                            aria-label="Deadline"
                                            title="Select the deadline date"
                                          />                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          disabled={!name.trim() || actions.length === 0}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {rule ? 'Update Rule' : 'Create Rule'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WorkflowRuleBuilder;
