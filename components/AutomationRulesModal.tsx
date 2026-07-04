import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAutomation } from '../hooks/useAutomation';
import { AutomationRule, TriggerType, ActionType } from '../types/automation';
import { ApplicationStatus } from '../types';
import { STATUS_OPTIONS } from '../constants';
import AutomationRuleBuilder from './AutomationRuleBuilder';
import { useConfirmation } from '../hooks/useConfirmation';
import ConfirmationModal from './ConfirmationModal';
import { ToggleSwitch, MaterialIcon, formSecondaryBtnClass, formIconBtnClass, formDashedAddClass, formMutedTextClass, formCardClass } from './ApplicationFormUI';

interface AutomationRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AutomationRulesModal: React.FC<AutomationRulesModalProps> = ({ isOpen, onClose }) => {
  useLockBodyScroll(isOpen);
  useEscapeKey(isOpen, onClose);
  const { rules, toggleRule, deleteRule, executionLogs, clearLogs } = useAutomation();
  const { confirmation, showConfirmation, closeConfirmation } = useConfirmation();
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  if (!isOpen) return null;

  return (
    <>
    <ConfirmationModal
      isOpen={confirmation.isOpen}
      onClose={closeConfirmation}
      onConfirm={confirmation.onConfirm}
      title={confirmation.title}
      message={confirmation.message}
      isDanger={confirmation.isDanger}
    />
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
          <div className="p-6 border-b border-[#27272a]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#f4f4f5]">Automation Rules</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className={formSecondaryBtnClass}
                  aria-label={showLogs ? 'Hide execution logs' : 'Show execution logs'}
                >
                  <MaterialIcon name="history" className="inline mr-1" />
                  Logs ({executionLogs.length})
                </button>
                <button
                  onClick={onClose}
                  className={formIconBtnClass}
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
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Clear Logs
                  </button>
                </div>
                {executionLogs.length === 0 ? (
                  <p className={`text-center ${formMutedTextClass} py-8`}>No execution logs yet.</p>
                ) : (
                  <div className="space-y-2">
                    {executionLogs.slice().reverse().slice(0, 50).map(log => (
                      <div
                        key={log.id}
                        className={`p-3 ${formCardClass} rounded-lg`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{log.ruleName}</div>
                            <div className="text-xs text-[#a1a1aa]">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-xs text-[#a1a1aa]">
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
                    className={formDashedAddClass}
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
                  <p className={`text-center ${formMutedTextClass} py-8`}>No automation rules defined.</p>
                )}

                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-4 ${formCardClass} rounded-lg`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <ToggleSwitch
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          aria-label={`Toggle rule "${rule.name}"`}
                        />
                        <div>
                          <div className="font-semibold text-[#f4f4f5]">{rule.name}</div>
                          <div className={`text-xs ${formMutedTextClass}`}>
                            {rule.trigger.replace('_', ' ')} • Executed {rule.executionCount} times
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className={`${formIconBtnClass} p-2`}
                          aria-label={`Edit rule "${rule.name}"`}
                          title={`Edit rule "${rule.name}"`}
                        >
                          <MaterialIcon name="edit" className="text-lg" />
                        </button>
                        <button
                          onClick={() => {
                            showConfirmation(`Delete Rule`, `Delete rule "${rule.name}"?`, () => deleteRule(rule.id), true);
                          }}
                          className="p-2 text-[#dc2626] hover:bg-[#27272a] rounded"
                          aria-label={`Delete rule "${rule.name}"`}
                          title={`Delete rule "${rule.name}"`}
                        >
                          <MaterialIcon name="delete" className="text-lg" />
                        </button>
                      </div>
                    </div>
                    <div className={`text-sm ${formMutedTextClass}`}>
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
    </>
  );
};

export default AutomationRulesModal;
