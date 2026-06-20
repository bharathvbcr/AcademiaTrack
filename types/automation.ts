import { Application } from './interfaces';
import { ApplicationStatus } from './enums';

export type TriggerType = 
  | 'status_changed'
  | 'deadline_approaching'
  | 'deadline_passed'
  | 'field_updated'
  | 'application_created'
  | 'scheduled';

export type ActionType =
  | 'create_reminder'
  | 'update_status'
  | 'update_field'
  | 'add_tag'
  | 'remove_tag'
  | 'send_notification'
  | 'log_action';

export interface AutomationCondition {
  field: keyof Application;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
}

export type AutomationAction =
  | { type: 'create_reminder'; params: { text?: string; date?: string; daysOffset?: number } }
  | { type: 'update_status'; params: { status: ApplicationStatus } }
  | { type: 'update_field'; params: { field: string; value: unknown } }
  | { type: 'add_tag'; params: { tag: string } }
  | { type: 'remove_tag'; params: { tag: string } }
  | { type: 'send_notification'; params: { title?: string; body?: string } }
  | { type: 'log_action'; params: { message?: string } };

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerType;
  triggerParams?: {
    status?: ApplicationStatus;
    field?: string;
    daysBefore?: number;
    schedule?: string; // Cron-like expression
  };
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  createdAt: number;
  updatedAt: number;
  lastExecuted?: number;
  executionCount: number;
}

// Context passed alongside a trigger. Fields are optional because which ones are
// present depends on the trigger type (status_changed supplies newStatus/oldStatus,
// field_updated supplies field). Using a single optional-field shape lets callers
// read the relevant property without unsafe union narrowing.
export interface TriggerData {
  newStatus?: ApplicationStatus;
  oldStatus?: ApplicationStatus;
  field?: string;
}

export interface AutomationExecutionLog {
  id: string;
  ruleId: string;
  ruleName: string;
  applicationId: string;
  timestamp: number;
  success: boolean;
  error?: string;
  actionsExecuted: string[];
}
