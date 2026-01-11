import React, { useState, useEffect } from 'react';
import { useAutomation } from '../hooks/useAutomation';
import { AutomationRule, TriggerType, ActionType, AutomationCondition, AutomationAction } from '../types/automation';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';

interface AutomationRuleBuilderProps {
  rule?: AutomationRule;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const AutomationRuleBuilder: React.FC<AutomationRuleBuilderProps> = ({ rule, onSave, onCancel }) => {
  const { addRule, updateRule } = useAutomation();
  const [name, setName] = useState(rule?.name || '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [trigger, setTrigger] = useState<TriggerType>(rule?.trigger || 'status_changed');
  const [triggerParams, setTriggerParams] = useState(rule?.triggerParams || {});
  const [conditions, setConditions] = useState<AutomationCondition[]>(rule?.conditions || []);
  const [actions, setActions] = useState<AutomationAction[]>(rule?.actions || []);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a rule name');
      return;
    }
    if (actions.length === 0) {
      alert('Please add at least one action');
      return;
    }

    const ruleData: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'> = {
      name: name.trim(),
      enabled,
      trigger,
      triggerParams: Object.keys(triggerParams).length > 0 ? triggerParams : undefined,
      conditions: conditions.length > 0 ? conditions : undefined,
      actions,
    };

    if (rule) {
      updateRule(rule.id, ruleData);
      onSave({ ...rule, ...ruleData, updatedAt: Date.now() } as AutomationRule);
    } else {
      const id = addRule(ruleData);
      onSave({ ...ruleData, id, createdAt: Date.now(), updatedAt: Date.now(), executionCount: 0 } as AutomationRule);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { field: 'status', operator: 'equals', value: '' }]);
  };

  const updateCondition = (index: number, updates: Partial<AutomationCondition>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([...actions, { type: 'create_reminder', params: {} }]);
  };

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    setActions(actions.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div>
        <label className="block text-sm font-medium mb-2">Rule Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Auto-remind on submission"
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enabled</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Trigger</label>
        <select
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as TriggerType)}
          className="w-full px-4 py-2 border rounded-lg"
          aria-label="Select trigger type"
          title="Select trigger type"
        >
          <option value="status_changed">Status Changed</option>
          <option value="deadline_approaching">Deadline Approaching</option>
          <option value="deadline_passed">Deadline Passed</option>
          <option value="field_updated">Field Updated</option>
          <option value="application_created">Application Created</option>
          <option value="scheduled">Scheduled</option>
        </select>

        {trigger === 'status_changed' && (
          <div className="mt-2">
            <label className="block text-xs mb-1">When status changes to:</label>
            <select
              value={triggerParams.status || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, status: e.target.value as ApplicationStatus })}
              className="w-full px-3 py-1.5 border rounded text-sm"
              aria-label="Select status for trigger"
              title="Select status for trigger"
            >
              <option value="">Any status</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {trigger === 'deadline_approaching' && (
          <div className="mt-2">
            <label className="block text-xs mb-1">Days before deadline:</label>
            <input
              type="number"
              value={triggerParams.daysBefore || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, daysBefore: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-1.5 border rounded text-sm"
              placeholder="7"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Conditions (Optional)</label>
          <button
            onClick={addCondition}
            className="text-xs px-2 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Add Condition
          </button>
        </div>
        {conditions.map((condition, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={condition.field}
              onChange={(e) => updateCondition(index, { field: e.target.value })}
              className="px-2 py-1 border rounded text-sm"
              aria-label={`Condition ${index + 1} field`}
              title={`Condition ${index + 1} field`}
            >
              <option value="status">Status</option>
              <option value="programType">Program Type</option>
              <option value="universityName">University Name</option>
            </select>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
              className="px-2 py-1 border rounded text-sm"
              aria-label={`Condition ${index + 1} operator`}
              title={`Condition ${index + 1} operator`}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="is_empty">Is Empty</option>
              <option value="is_not_empty">Is Not Empty</option>
            </select>
            <input
              type="text"
              value={typeof condition.value === 'boolean' ? String(condition.value) : (condition.value?.toString() || '')}
              onChange={(e) => {
                const newValue = e.target.value;
                // Try to parse as number if it looks like a number
                let parsedValue: string | number | boolean = newValue;
                if (newValue === 'true') parsedValue = true;
                else if (newValue === 'false') parsedValue = false;
                else if (!isNaN(Number(newValue)) && newValue.trim() !== '') parsedValue = Number(newValue);
                updateCondition(index, { value: parsedValue });
              }}
              className="flex-1 px-2 py-1 border rounded text-sm"
              placeholder="Value"
            />
            <button
              onClick={() => removeCondition(index)}
              className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              aria-label={`Remove condition ${index + 1}`}
              title={`Remove condition ${index + 1}`}
            >
              <MaterialIcon name="delete" className="text-sm" />
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium">Actions</label>
          <button
            onClick={addAction}
            className="text-xs px-2 py-1 border rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Add Action
          </button>
        </div>
        {actions.map((action, index) => (
          <div key={index} className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded border">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={action.type}
                onChange={(e) => updateAction(index, { type: e.target.value as ActionType, params: {} })}
                className="px-2 py-1 border rounded text-sm"
                aria-label={`Action ${index + 1} type`}
                title={`Action ${index + 1} type`}
              >
                <option value="create_reminder">Create Reminder</option>
                <option value="update_status">Update Status</option>
                <option value="update_field">Update Field</option>
                <option value="add_tag">Add Tag</option>
                <option value="remove_tag">Remove Tag</option>
              </select>
              <button
                onClick={() => removeAction(index)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                aria-label={`Remove action ${index + 1}`}
                title={`Remove action ${index + 1}`}
              >
                <MaterialIcon name="delete" className="text-sm" />
              </button>
            </div>
            {action.type === 'create_reminder' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={action.params.text || ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, text: e.target.value } })}
                  placeholder="Reminder text"
                  className="w-full px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  value={action.params.daysOffset || ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, daysOffset: parseInt(e.target.value) || 0 } })}
                  placeholder="Days from trigger (0 = same day)"
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            )}
            {action.type === 'update_status' && (
              <select
                value={action.params.status || ''}
                onChange={(e) => updateAction(index, { params: { ...action.params, status: e.target.value } })}
                className="w-full px-2 py-1 border rounded text-sm"
                aria-label={`Action ${index + 1} status`}
                title={`Action ${index + 1} status`}
              >
                <option value="">Select status...</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {action.type === 'add_tag' && (
              <input
                type="text"
                value={action.params.tag || ''}
                onChange={(e) => updateAction(index, { params: { ...action.params, tag: e.target.value } })}
                placeholder="Tag name"
                className="w-full px-2 py-1 border rounded text-sm"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Save Rule
        </button>
      </div>
    </div>
  );
};

export default AutomationRuleBuilder;
