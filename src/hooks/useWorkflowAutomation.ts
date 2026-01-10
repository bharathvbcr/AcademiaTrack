import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Application, ApplicationStatus } from '../types';
import { WorkflowRule, WorkflowTrigger, WorkflowAction } from '../types/workflow';

export const useWorkflowAutomation = () => {
  const [rules, setRules] = useLocalStorage<WorkflowRule[]>('workflow-rules', []);
  const [isEnabled, setIsEnabled] = useLocalStorage<boolean>('workflow-automation-enabled', true);
  const lastExecutionRef = useRef<Map<string, string>>(new Map()); // Track last execution per rule+app

  const addRule = useCallback((rule: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>) => {
    const newRule: WorkflowRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      executionCount: 0,
    };
    setRules(prev => [...prev, newRule]);
    return newRule.id;
  }, [setRules]);

  const updateRule = useCallback((id: string, updates: Partial<WorkflowRule>) => {
    setRules(prev => prev.map(rule => rule.id === id ? { ...rule, ...updates } : rule));
  }, [setRules]);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
  }, [setRules]);

  const toggleRule = useCallback((id: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  }, [setRules]);

  // Check if trigger conditions are met
  const checkTrigger = useCallback((trigger: WorkflowTrigger, app: Application, previousApp?: Application): boolean => {
    switch (trigger.type) {
      case 'status_changed':
        if (!previousApp) return false;
        const fromMatch = !trigger.conditions?.fromStatus || previousApp.status === trigger.conditions.fromStatus;
        const toMatch = !trigger.conditions?.toStatus || app.status === trigger.conditions.toStatus;
        return fromMatch && toMatch && previousApp.status !== app.status;

      case 'deadline_approaching':
        if (!app.deadline || !trigger.conditions?.daysBefore) return false;
        const deadline = new Date(app.deadline);
        const today = new Date();
        const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays === trigger.conditions.daysBefore;

      case 'document_submitted':
        if (!trigger.conditions?.documentType) return false;
        const docKey = trigger.conditions.documentType as keyof typeof app.documents;
        const doc = app.documents[docKey];
        if (!doc) return false;
        if (!previousApp) return doc.submitted !== null;
        const prevDoc = previousApp.documents[docKey];
        return prevDoc?.submitted === null && doc.submitted !== null;

      case 'field_updated':
        if (!previousApp || !trigger.conditions?.fieldName) return false;
        const fieldName = trigger.conditions.fieldName as keyof Application;
        const prevValue = (previousApp as any)[fieldName];
        const currValue = (app as any)[fieldName];
        if (trigger.conditions.fieldValue !== undefined) {
          return prevValue !== trigger.conditions.fieldValue && currValue === trigger.conditions.fieldValue;
        }
        return prevValue !== currValue;

      case 'application_created':
        return !previousApp; // New application

      case 'tag_added':
        if (!trigger.conditions?.tagName) return false;
        const tagName = trigger.conditions.tagName;
        if (!previousApp) return app.tags?.includes(tagName) || false;
        return !previousApp.tags?.includes(tagName) && (app.tags?.includes(tagName) || false);

      case 'days_before_deadline':
        if (!app.deadline || !trigger.conditions?.daysBefore) return false;
        const deadlineDate = new Date(app.deadline);
        const now = new Date();
        const daysDiff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff === trigger.conditions.daysBefore;

      default:
        return false;
    }
  }, []);

  // Execute action on application
  const executeAction = useCallback((action: WorkflowAction, app: Application): Partial<Application> => {
    const updates: Partial<Application> = {};

    switch (action.type) {
      case 'create_reminder':
        if (action.params?.reminderText) {
          const reminder = {
            id: crypto.randomUUID(),
            text: action.params.reminderText,
            date: action.params.reminderDate || new Date().toISOString(),
            completed: false,
          };
          updates.reminders = [...(app.reminders || []), reminder];
        }
        break;

      case 'update_field':
        if (action.params?.fieldName) {
          (updates as any)[action.params.fieldName] = action.params.fieldValue;
        }
        break;

      case 'change_status':
        if (action.params?.status) {
          updates.status = action.params.status as ApplicationStatus;
        }
        break;

      case 'add_tag':
        if (action.params?.tagName) {
          const tags = app.tags || [];
          if (!tags.includes(action.params.tagName)) {
            updates.tags = [...tags, action.params.tagName];
          }
        }
        break;

      case 'remove_tag':
        if (action.params?.tagName) {
          updates.tags = (app.tags || []).filter(t => t !== action.params?.tagName);
        }
        break;

      case 'set_deadline':
        if (action.params?.deadline) {
          updates.deadline = action.params.deadline;
        }
        break;

      case 'send_notification':
        if (window.electron && action.params?.notificationTitle && action.params?.notificationMessage) {
          window.electron.showNotification(
            action.params.notificationTitle,
            action.params.notificationMessage
          );
        }
        break;
    }

    return updates;
  }, []);

  // Process rules for an application update
  const processRules = useCallback((
    app: Application,
    previousApp?: Application,
    onUpdate?: (app: Application, updates: Partial<Application>) => void
  ) => {
    if (!isEnabled) return;

    const enabledRules = rules.filter(rule => rule.enabled);
    const ruleKey = `${app.id}`;

    for (const rule of enabledRules) {
      const executionKey = `${rule.id}-${app.id}`;
      const lastExecuted = lastExecutionRef.current.get(executionKey);
      
      // Prevent duplicate executions on the same update
      if (lastExecuted && new Date(lastExecuted).getTime() > Date.now() - 1000) {
        continue;
      }

      if (checkTrigger(rule.trigger, app, previousApp)) {
        // Execute all actions
        let accumulatedUpdates: Partial<Application> = {};
        
        for (const action of rule.actions) {
          const actionUpdates = executeAction(action, { ...app, ...accumulatedUpdates });
          accumulatedUpdates = { ...accumulatedUpdates, ...actionUpdates };
        }

        // Apply updates
        if (Object.keys(accumulatedUpdates).length > 0 && onUpdate) {
          onUpdate(app, accumulatedUpdates);
        }

        // Update rule execution tracking
        lastExecutionRef.current.set(executionKey, new Date().toISOString());
        updateRule(rule.id, {
          lastExecuted: new Date().toISOString(),
          executionCount: rule.executionCount + 1,
        });
      }
    }
  }, [rules, isEnabled, checkTrigger, executeAction, updateRule]);

  // Periodic check for deadline-based triggers
  useEffect(() => {
    if (!isEnabled) return;

    const checkDeadlineRules = () => {
      // This will be called from App.tsx with applications
      // For now, we just set up the interval
    };

    const interval = setInterval(checkDeadlineRules, 60 * 60 * 1000); // Check every hour
    return () => clearInterval(interval);
  }, [isEnabled]);

  return {
    rules,
    isEnabled,
    setIsEnabled,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    processRules,
  };
};
