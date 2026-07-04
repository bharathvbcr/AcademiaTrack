import React, { useState } from 'react';
import { useAutomation } from '../hooks/useAutomation';
import { AutomationRule, TriggerType, ActionType, AutomationCondition, AutomationAction } from '../types/automation';
import { Application, ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import {
  MaterialIcon,
  ToggleSwitch,
  formInputClass,
  formInputSmClass,
  formActionBtnClass,
  formPrimaryBtnClass,
  formSecondaryBtnClass,
} from './ApplicationFormUI';

interface AutomationRuleBuilderProps {
  rule?: AutomationRule;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

const AutomationRuleBuilder: React.FC<AutomationRuleBuilderProps> = ({ rule, onSave, onCancel }) => {
  const { addRule, updateRule } = useAutomation();
  const [name, setName] = useState(rule?.name || '');
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [trigger, setTrigger] = useState<TriggerType>(rule?.trigger || 'status_changed');
  const [triggerParams, setTriggerParams] = useState(rule?.triggerParams || {});
  const [conditions, setConditions] = useState<AutomationCondition[]>(rule?.conditions || []);
  const [actions, setActions] = useState<AutomationAction[]>(rule?.actions || []);
  const [nameError, setNameError] = useState('');
  const [actionsError, setActionsError] = useState('');

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Rule name is required');
      return;
    }
    if (actions.length === 0) {
      setActionsError('At least one action is required');
      return;
    }
    setNameError('');
    setActionsError('');

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

  // `updates` is intentionally loose: the editor merges partial type/params edits
  // into a discriminated-union member, which TypeScript cannot express via
  // Partial<AutomationAction>. The merged result is asserted back to the union.
  const updateAction = (index: number, updates: { type?: ActionType; params?: Record<string, unknown> }) => {
    setActions(actions.map((a, i) => i === index ? ({ ...a, ...updates } as AutomationAction) : a));
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 p-4 bg-[#18181b] rounded-lg border border-[#27272a]">
      <div>
        <label htmlFor="rule-name" className="block text-sm font-medium text-[#f4f4f5] mb-2">Rule Name</label>
        <input
          id="rule-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Auto-remind on submission"
          className={formInputClass}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? 'rule-name-error' : undefined}
        />
        {nameError && <p id="rule-name-error" role="alert" className="text-red-500 text-sm mt-1">{nameError}</p>}
      </div>

      <div>
        <ToggleSwitch
          id="rule-enabled"
          checked={enabled}
          onChange={setEnabled}
          label="Enabled"
          aria-label="Rule enabled"
        />
      </div>

      <div>
        <label htmlFor="rule-trigger" className="block text-sm font-medium text-[#f4f4f5] mb-2">Trigger</label>
        <select
          id="rule-trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value as TriggerType)}
          className={formInputClass}
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
            <label className="block text-xs text-[#a1a1aa] mb-1">When status changes to:</label>
            <select
              value={triggerParams.status || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, status: e.target.value as ApplicationStatus })}
              className={formInputSmClass}
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
            <label htmlFor="days-before-deadline" className="block text-xs text-[#a1a1aa] mb-1">Days before deadline:</label>
            <input
              id="days-before-deadline"
              type="number"
              value={triggerParams.daysBefore || ''}
              onChange={(e) => setTriggerParams({ ...triggerParams, daysBefore: parseInt(e.target.value) || 0 })}
              className={formInputSmClass}
              placeholder="7"
            />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-[#f4f4f5]">Conditions (Optional)</label>
          <button
            onClick={addCondition}
            className={formActionBtnClass}
          >
            Add Condition
          </button>
        </div>
        {conditions.map((condition, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <select
              value={condition.field}
              onChange={(e) => updateCondition(index, { field: e.target.value as keyof Application })}
              className={formInputSmClass}
              aria-label={`Condition ${index + 1} field`}
              title={`Condition ${index + 1} field`}
            >
              <option value="status">Status</option>
              <option value="programType">Program Type</option>
              <option value="universityName">University Name</option>
              <option value="applicationFee">Application Fee</option>
            </select>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(index, { operator: e.target.value as any })}
              className={formInputSmClass}
              aria-label={`Condition ${index + 1} operator`}
              title={`Condition ${index + 1} operator`}
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="contains">Contains</option>
              <option value="greater_than">Greater Than</option>
              <option value="less_than">Less Than</option>
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
              className={`flex-1 ${formInputSmClass}`}
              placeholder="Value"
            />
            <button
              onClick={() => removeCondition(index)}
              className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
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
          <label className="block text-sm font-medium text-[#f4f4f5]">Actions</label>
          <button
            onClick={() => { addAction(); setActionsError(''); }}
            className={formActionBtnClass}
          >
            Add Action
          </button>
        </div>
        {actionsError && <p role="alert" className="text-red-500 text-sm mb-2">{actionsError}</p>}
        {actions.map((action, index) => (
          <div key={index} className="mb-3 p-3 bg-[#09090b] rounded-lg border border-[#27272a]">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={action.type}
                onChange={(e) => updateAction(index, { type: e.target.value as ActionType, params: {} })}
                className={formInputSmClass}
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
                className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
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
                  aria-label="Reminder text"
                  value={action.params.text || ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, text: e.target.value } })}
                  placeholder="Reminder text"
                  className={formInputSmClass}
                />
                <input
                  type="number"
                  aria-label="Days from trigger (0 = same day)"
                  value={action.params.daysOffset || ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, daysOffset: parseInt(e.target.value) || 0 } })}
                  placeholder="Days from trigger (0 = same day)"
                  className={formInputSmClass}
                />
              </div>
            )}
            {action.type === 'update_status' && (
              <select
                value={action.params.status || ''}
                onChange={(e) => updateAction(index, { params: { ...action.params, status: e.target.value } })}
                className={formInputSmClass}
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
                aria-label="Tag name"
                value={action.params.tag || ''}
                onChange={(e) => updateAction(index, { params: { ...action.params, tag: e.target.value } })}
                placeholder="Tag name"
                className={formInputSmClass}
              />
            )}
            {action.type === 'remove_tag' && (
              <input
                type="text"
                aria-label="Tag name"
                value={action.params.tag || ''}
                onChange={(e) => updateAction(index, { params: { ...action.params, tag: e.target.value } })}
                placeholder="Tag name"
                className={formInputSmClass}
              />
            )}
            {action.type === 'update_field' && (
              <div className="space-y-2">
                <input
                  type="text"
                  aria-label="Field name"
                  value={action.params.field || ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, field: e.target.value } })}
                  placeholder="Field name"
                  className={formInputSmClass}
                />
                <input
                  type="text"
                  aria-label="New value"
                  value={action.params.value != null ? String(action.params.value) : ''}
                  onChange={(e) => updateAction(index, { params: { ...action.params, value: e.target.value } })}
                  placeholder="New value"
                  className={formInputSmClass}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className={formSecondaryBtnClass}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className={formPrimaryBtnClass}
        >
          Save Rule
        </button>
      </div>
    </div>
  );
};

export default AutomationRuleBuilder;
