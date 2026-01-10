import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Application, ProgramType, ApplicationStatus } from '../types';
import { emptyApplication } from '../hooks/useApplicationForm';
import { searchLocation } from '../utils/locationService';
import { useTemplates } from '../hooks/useTemplates';

interface QuickCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (app: Application) => void;
}

const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onSave }) => {
    useLockBodyScroll(isOpen);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);
    const { templates, useTemplate } = useTemplates();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setInput('');
            setSelectedTemplateId('');
        }
    }, [isOpen]);

    const parseAndSubmit = async () => {
        if (!input.trim()) return;
        setIsProcessing(true);

        try {
            // Basic natural language parsing
            // Expected formats:
            // "University Name"
            // "University Name, PhD"
            // "University Name, PhD in CS"
            // "MIT, MS, Dec 1"
            // "MIT, PhD, template:phd-cs"

            let inputText = input;
            let templateId: string | null = null;

            // Check for explicit template syntax: "template:id"
            const templateMatch = inputText.match(/template:(\S+)/i);
            if (templateMatch) {
                templateId = templateMatch[1];
                inputText = inputText.replace(/template:\S+/i, '').trim();
            } else if (selectedTemplateId) {
                templateId = selectedTemplateId;
            }

            const parts = inputText.split(',').map(p => p.trim()).filter(p => p);
            const universityName = parts[0] || '';
            if (!universityName) {
                setIsProcessing(false);
                return;
            }

            let programType = ProgramType.PhD;
            let programName = '';
            let deadline = null;
            let department = '';

            // Try to infer other fields
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                const lowerPart = part.toLowerCase();

                // Check for program type
                if (lowerPart.includes('phd') || lowerPart.includes('doctorate')) programType = ProgramType.PhD;
                else if (lowerPart.includes('ms') || lowerPart.includes('master')) programType = ProgramType.Masters;

                // Check for date (very basic check)
                if (part.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i)) {
                    // Assume current or next year
                    const date = new Date(part + " " + new Date().getFullYear());
                    if (!isNaN(date.getTime())) {
                        if (date < new Date()) date.setFullYear(date.getFullYear() + 1);
                        deadline = date.toISOString().split('T')[0];
                    }
                }

                // Check for "in [Department]"
                if (lowerPart.startsWith('in ')) {
                    programName = part.substring(3);
                    department = part.substring(3);
                }
            }

            // Apply template if specified or auto-detect based on program type
            let templateValues: Partial<Application> = {};
            if (templateId) {
                templateValues = useTemplate(templateId) || {};
            } else {
                // Auto-detect template based on program type
                const matchingTemplate = templates.find(t => 
                    t.programType === programType && 
                    (t.name.toLowerCase().includes('cs') || t.name.toLowerCase().includes('computer'))
                );
                if (matchingTemplate) {
                    templateValues = useTemplate(matchingTemplate.id) || {};
                }
            }

            // Try to find location
            let location = '';
            try {
                const locations = await searchLocation(universityName);
                if (locations && locations.length > 0) {
                    location = [locations[0].city, locations[0].state, locations[0].country].filter(Boolean).join(', ');
                }
            } catch (e) {
                console.error("Location lookup failed", e);
            }

            const newApp: Application = {
                ...emptyApplication,
                ...templateValues, // Apply template values first
                id: crypto.randomUUID(),
                universityName,
                programType: templateValues.programType || programType,
                programName: programName || templateValues.programName || 'General',
                department: department || templateValues.department || '',
                location: location || templateValues.location || '',
                deadline: deadline || templateValues.deadline || null,
                status: ApplicationStatus.NotStarted,
                universityRanking: templateValues.universityRanking || '0',
                departmentRanking: templateValues.departmentRanking || '0',
            };

            onSave(newApp);
            setInput('');
            setSelectedTemplateId('');
            onClose();
        } catch (error) {
            console.error("Quick capture failed", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            parseAndSubmit();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <motion.div
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    />

                    <motion.div
                        className="relative w-full max-w-2xl"
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-500">bolt</span>
                                    Quick Capture
                                </h3>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. Stanford University, PhD in CS, Dec 15, template:phd-cs"
                                    className="w-full text-xl bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none py-2 px-1 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                    autoComplete="off"
                                    disabled={isProcessing}
                                />

                                {/* Template Selector */}
                                {templates.length > 0 && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Or select a template:
                                        </label>
                                        <select
                                            value={selectedTemplateId}
                                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                                            disabled={isProcessing}
                                            aria-label="Select a template"
                                        >
                                            <option value="">No template</option>
                                            {templates.map(template => (
                                                <option key={template.id} value={template.id}>
                                                    {template.name} {template.description ? `- ${template.description}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="flex justify-between items-center mt-4 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex gap-4">
                                        <span>Hit <kbd className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Enter</kbd> to save</span>
                                        <span><kbd className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">Esc</kbd> to close</span>
                                    </div>
                                    {isProcessing && (
                                        <div className="flex items-center gap-2 text-blue-500">
                                            <span className="animate-spin material-symbols-outlined text-sm">sync</span>
                                            Processing...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QuickCaptureModal;
