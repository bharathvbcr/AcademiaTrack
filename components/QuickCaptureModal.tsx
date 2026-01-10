import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { backdropVariants, modalVariants } from '../hooks/useAnimations';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { Application, ProgramType, ApplicationStatus } from '../types';
import { emptyApplication } from '../hooks/useApplicationForm';
import { searchLocation } from '../utils/locationService';

interface QuickCaptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (app: Application) => void;
}

const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onSave }) => {
    useLockBodyScroll(isOpen);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setInput('');
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

            const parts = input.split(',').map(p => p.trim());
            const universityName = parts[0];
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
                id: crypto.randomUUID(),
                universityName,
                programType,
                programName: programName || 'General',
                department,
                location,
                deadline,
                status: ApplicationStatus.NotStarted,
                universityRanking: '0',
                departmentRanking: '0',
            };

            onSave(newApp);
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
                                    placeholder="e.g. Stanford University, PhD in CS, Dec 15"
                                    className="w-full text-xl bg-transparent border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none py-2 px-1 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                    autoComplete="off"
                                    disabled={isProcessing}
                                />

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
