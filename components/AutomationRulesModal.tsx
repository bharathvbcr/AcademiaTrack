import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useAutomation } from '../hooks/useAutomation';
import { AutomationRule, TriggerType, ActionType } from '../types/automation';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import AutomationRuleBuilder from './AutomationRuleBuilder';

interface AutomationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  const { rules, toggleRule, deleteRule, executionLogs, clearLogs } = useAutomation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          onClick={onClose}
          className="fixed inset-0 liquid-glass-modal"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        />

        <motion.div
          className="relative liquid-glass-modal-content rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-[#E8B4B8]/30">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#F5D7DA]">Automation Rules</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="px-3 py-1.5 text-sm border border-[#E8B4B8]/30 rounded-lg hover:bg-[rgba(192,48,80,0.25)] liquid-glass text-[#F5D7DA]"
                >
                  <MaterialIcon name="history" className="inline mr-1" />
                  Logs ({executionLogs.length})
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-[rgba(192,48,80,0.25)] rounded-lg text-[#E8B4B8] hover:text-[#F5D7DA]"
                  aria-label="Close automation rules modal"
                  title="Close automation rules modal"
                >
                  <MaterialIcon name="close" className="text-xl" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {showLogs ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Execution Logs</h3>
                  <button
                    onClick={clearLogs}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear Logs
                  </button>
                </div>
                {executionLogs.length === 0 ? (
                  <p className="text-center text-[#E8B4B8]/70 py-8">No execution logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {executionLogs.slice().reverse().slice(0, 50).map(log => (
                      <div
                        key={log.id}
                        className="p-3 liquid-glass-card rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{log.ruleName}</div>
                            <div className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500">
                            {log.actionsExecuted.join(', ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {!isCreating && !editingRule && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full p-4 border-2 border-dashed border-[#E8B4B8]/30 rounded-lg hover:border-[#C03050] text-[#E8B4B8] hover:text-[#C03050] transition-colors"
                  >
                    <MaterialIcon name="add" className="inline mr-2" />
                    Create New Rule
                  </button>
                )}

                {(isCreating || editingRule) && (
                  <AutomationRuleBuilder
                    rule={editingRule || undefined}
                    onSave={(rule) => {
                      setIsCreating(false);
                      setEditingRule(null);
                    }}
                    onCancel={() => {
                      setIsCreating(false);
                      setEditingRule(null);
                    }}
                  />
                )}

                {rules.length === 0 && !isCreating && (
                  <p className="text-center text-[#E8B4B8]/70 py-8">No automation rules defined.</p>
                )}

                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className="p-4 liquid-glass-card rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => toggleRule(rule.id)}
                            className="sr-only peer"
                            aria-label={`Toggle rule "${rule.name}"`}
                            title={`Toggle rule "${rule.name}"`}
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                        <div>
                          <div className="font-semibold text-[#F5D7DA]">{rule.name}</div>
                          <div className="text-xs text-[#E8B4B8]/70">
                            {rule.trigger.replace('_', ' ')} • Executed {rule.executionCount} times
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="p-2 text-[#E8B4B8] hover:bg-[rgba(192,48,80,0.25)] rounded"
                          aria-label={`Edit rule "${rule.name}"`}
                          title={`Edit rule "${rule.name}"`}
                        >
                          <MaterialIcon name="edit" className="text-lg" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete rule "${rule.name}"?`)) {
                              deleteRule(rule.id);
                            }
                          }}
                          className="p-2 text-[#E03030] hover:bg-[rgba(224,48,48,0.25)] rounded"
                          aria-label={`Delete rule "${rule.name}"`}
                          title={`Delete rule "${rule.name}"`}
                        >
                          <MaterialIcon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-[#E8B4B8]/70">
                      <div>When: {rule.trigger.replace('_', ' ')}</div>
                      {rule.actions.length > 0 && (
                        <div>Then: {rule.actions.map(a => a.type.replace('_', ' ')).join(', ')}</div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AutomationRulesModal;
