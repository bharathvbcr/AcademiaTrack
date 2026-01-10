export type WorkflowTriggerType =
  | 'status_changed'
  | 'deadline_approaching'
  | 'document_submitted'
  | 'field_updated'
  | 'application_created'
  | 'tag_added'
  | 'days_before_deadline';

export type WorkflowActionType =
  | 'create_reminder'
  | 'update_field'
  | 'change_status'
  | 'add_tag'
  | 'remove_tag'
  | 'send_notification'
  | 'set_deadline';

export interface WorkflowTrigger {
  type: WorkflowTriggerType;
  conditions?: {
    // For status_changed
    fromStatus?: string;
    toStatus?: string;
    // For deadline_approaching
    daysBefore?: number;
    // For document_submitted
    documentType?: string;
    // For field_updated
    fieldName?: string;
    fieldValue?: any;
    // For tag_added
    tagName?: string;
  };
}

export interface WorkflowAction {
  type: WorkflowActionType;
  params?: {
    // For create_reminder
    reminderText?: string;
    reminderDate?: string;
    // For update_field
    fieldName?: string;
    fieldValue?: any;
    // For change_status
    status?: string;
    // For add_tag / remove_tag
    tagName?: string;
    // For send_notification
    notificationTitle?: string;
    notificationMessage?: string;
    // For set_deadline
    deadline?: string;
  };
}

export interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: string;
  lastExecuted?: string;
  executionCount: number;
}

export const TRIGGER_TYPES: Array<{ value: WorkflowTriggerType; label: string; description: string }> = [
  {
    value: 'status_changed',
    label: 'Status Changed',
    description: 'When application status changes',
  },
  {
    value: 'deadline_approaching',
    label: 'Deadline Approaching',
    description: 'When deadline is within X days',
  },
  {
    value: 'document_submitted',
    label: 'Document Submitted',
    description: 'When a document is marked as submitted',
  },
  {
    value: 'field_updated',
    label: 'Field Updated',
    description: 'When a specific field is updated',
  },
  {
    value: 'application_created',
    label: 'Application Created',
    description: 'When a new application is created',
  },
  {
    value: 'tag_added',
    label: 'Tag Added',
    description: 'When a tag is added to an application',
  },
  {
    value: 'days_before_deadline',
    label: 'Days Before Deadline',
    description: 'Trigger X days before deadline',
  },
];

export const ACTION_TYPES: Array<{ value: WorkflowActionType; label: string; description: string }> = [
  {
    value: 'create_reminder',
    label: 'Create Reminder',
    description: 'Add a reminder to the application',
  },
  {
    value: 'update_field',
    label: 'Update Field',
    description: 'Update a specific field value',
  },
  {
    value: 'change_status',
    label: 'Change Status',
    description: 'Change the application status',
  },
  {
    value: 'add_tag',
    label: 'Add Tag',
    description: 'Add a tag to the application',
  },
  {
    value: 'remove_tag',
    label: 'Remove Tag',
    description: 'Remove a tag from the application',
  },
  {
    value: 'send_notification',
    label: 'Send Notification',
    description: 'Show a system notification',
  },
  {
    value: 'set_deadline',
    label: 'Set Deadline',
    description: 'Set or update the deadline',
  },
];
