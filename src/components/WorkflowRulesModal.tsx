import React, { useState } from 'react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useWorkflowAutomation } from '../hooks/useWorkflowAutomation';
import { WorkflowRule } from '../types/workflow';
import WorkflowRuleBuilder from './WorkflowRuleBuilder';

interface WorkflowRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const WorkflowRulesModal: React.FC<WorkflowRulesModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { rules, isEnabled, setIsEnabled, addRule, updateRule, deleteRule, toggleRule } = useWorkflowAutomation();
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (ruleData: Omit<WorkflowRule, 'id' | 'createdAt' | 'executionCount'>) => {
    if (editingRule) {
      updateRule(editingRule.id, ruleData);
      setEditingRule(null);
    } else {
      addRule(ruleData);
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Workflow Automation</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Create rules to automate actions based on triggers
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              aria-label="Close workflow rules modal"
            >
              <MaterialIcon name="close" className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {editingRule || isCreating ? (
            <WorkflowRuleBuilder
              rule={editingRule || undefined}
              onSave={handleSave}
              onCancel={() => {
                setEditingRule(null);
                setIsCreating(false);
              }}
            />
          ) : (
            <>
              {/* Enable/Disable Toggle */}
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Automation Enabled</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isEnabled ? 'Rules will execute automatically' : 'Rules are paused'}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    className="sr-only peer"
                    aria-label="Enable workflow automation"
                    title="Enable workflow automation"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Rules List */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Rules ({rules.length})</h3>
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <MaterialIcon name="add" className="text-sm" />
                  Create Rule
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <MaterialIcon name="auto_awesome" className="text-4xl text-slate-400 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No workflow rules yet</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    Create your first rule to automate actions
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map(rule => (
                    <div
                      key={rule.id}
                      className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-white">{rule.name}</h4>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                rule.enabled
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                              }`}
                            >
                              {rule.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{rule.description}</p>
                          )}
                          <div className="text-xs text-slate-400 dark:text-slate-500 space-y-1">
                            <div>
                              <span className="font-medium">Trigger:</span> {rule.trigger.type}
                              {rule.trigger.conditions && Object.keys(rule.trigger.conditions).length > 0 && (
                                <span className="ml-2">
                                  ({Object.entries(rule.trigger.conditions).map(([k, v]) => `${k}: ${v}`).join(', ')})
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Actions:</span> {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}
                            </div>
                            {rule.executionCount > 0 && (
                              <div>
                                Executed {rule.executionCount} time{rule.executionCount !== 1 ? 's' : ''}
                                {rule.lastExecuted && (
                                  <span className="ml-2">
                                    (last: {new Date(rule.lastExecuted).toLocaleString()})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleRule(rule.id)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title={rule.enabled ? 'Disable' : 'Enable'}
                            aria-label={rule.enabled ? `Disable rule ${rule.name}` : `Enable rule ${rule.name}`}
                          >
                            <MaterialIcon
                              name={rule.enabled ? 'toggle_on' : 'toggle_off'}
                              className="text-xl"
                            />
                          </button>
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="Edit"
                            aria-label={`Edit rule ${rule.name}`}
                          >
                            <MaterialIcon name="edit" className="text-sm" />
                          </button>
                          <button
                            onClick={() => deleteRule(rule.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete"
                            aria-label={`Delete rule ${rule.name}`}
                          >
                            <MaterialIcon name="delete" className="text-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowRulesModal;
