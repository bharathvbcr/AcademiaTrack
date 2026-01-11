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
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value?: string | number | boolean;
}

export interface AutomationAction {
  type: ActionType;
  params: Record<string, any>;
}

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
