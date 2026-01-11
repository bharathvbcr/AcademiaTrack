import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Application } from '../types';
import { AutomationRule, AutomationExecutionLog, AutomationCondition } from '../types/automation';

export const useAutomation = () => {
  const [rules, setRules] = useLocalStorage<AutomationRule[]>('automation-rules', []);
  const [executionLogs, setExecutionLogs] = useLocalStorage<AutomationExecutionLog[]>('automation-logs', []);

  const enabledRules = useMemo(() => rules.filter(r => r.enabled), [rules]);

  const addRule = useCallback((rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>) => {
    const newRule: AutomationRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      executionCount: 0,
    };
    setRules(prev => [...prev, newRule]);
    return newRule.id;
  }, [setRules]);

  const updateRule = useCallback((id: string, updates: Partial<AutomationRule>) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
    ));
  }, [setRules]);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  }, [setRules]);

  const toggleRule = useCallback((id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r
    ));
  }, [setRules]);

  // Check if conditions match
  const checkConditions = useCallback((app: Application, conditions?: AutomationCondition[]): boolean => {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = (app as any)[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'not_equals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(condition.value);
        case 'less_than':
          return Number(fieldValue) < Number(condition.value);
        case 'is_empty':
          return !fieldValue || fieldValue === '';
        case 'is_not_empty':
          return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
        default:
          return true;
      }
    });
  }, []);

  // Execute actions on an application
  const executeActions = useCallback((app: Application, actions: AutomationRule['actions']): Partial<Application> => {
    const updates: Partial<Application> = {};

    actions.forEach(action => {
      switch (action.type) {
        case 'create_reminder':
          const reminderDate = action.params.date 
            ? new Date(action.params.date)
            : new Date(Date.now() + (action.params.daysOffset || 0) * 24 * 60 * 60 * 1000);
          updates.reminders = [
            ...(app.reminders || []),
            {
              id: crypto.randomUUID(),
              text: action.params.text || 'Reminder',
              date: reminderDate.toISOString(),
              completed: false,
            },
          ];
          break;

        case 'update_status':
          if (action.params.status) {
            updates.status = action.params.status;
          }
          break;

        case 'update_field':
          if (action.params.field && action.params.value !== undefined) {
            (updates as any)[action.params.field] = action.params.value;
          }
          break;

        case 'add_tag':
          if (action.params.tag) {
            updates.tags = [...(app.tags || []), action.params.tag];
          }
          break;

        case 'remove_tag':
          if (action.params.tag) {
            updates.tags = (app.tags || []).filter(t => t !== action.params.tag);
          }
          break;
      }
    });

    return updates;
  }, []);

  // Execute rules for an application
  const executeRules = useCallback((
    app: Application,
    trigger: AutomationRule['trigger'],
    triggerData?: any
  ): Partial<Application> | null => {
    const applicableRules = enabledRules.filter(rule => {
      if (rule.trigger !== trigger) return false;

      // Check trigger-specific conditions
      if (trigger === 'status_changed' && rule.triggerParams?.status) {
        if (triggerData?.newStatus !== rule.triggerParams.status) return false;
      }

      if (trigger === 'field_updated' && rule.triggerParams?.field) {
        if (triggerData?.field !== rule.triggerParams.field) return false;
      }

      return checkConditions(app, rule.conditions);
    });

    if (applicableRules.length === 0) return null;

    // Combine all actions from applicable rules
    const allActions = applicableRules.flatMap(rule => rule.actions);
    const updates = executeActions(app, allActions);

    // Log execution
    applicableRules.forEach(rule => {
      const log: AutomationExecutionLog = {
        id: crypto.randomUUID(),
        ruleId: rule.id,
        ruleName: rule.name,
        applicationId: app.id,
        timestamp: Date.now(),
        success: true,
        actionsExecuted: rule.actions.map(a => a.type),
      };
      setExecutionLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
      updateRule(rule.id, { 
        executionCount: rule.executionCount + 1,
        lastExecuted: Date.now(),
      });
    });

    return updates;
  }, [enabledRules, checkConditions, executeActions, setExecutionLogs, updateRule]);

  const clearLogs = useCallback(() => {
    setExecutionLogs([]);
  }, [setExecutionLogs]);

  return {
    rules,
    enabledRules,
    executionLogs,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    executeRules,
    clearLogs,
  };
};
