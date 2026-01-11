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
    initialText?: string;
}

const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({ isOpen, onClose, onSave, initialText }) => {
    useLockBodyScroll(isOpen);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
            setInput(initialText || '');
        }
    }, [isOpen, initialText]);

    const parseAndSubmit = async () => {
        if (!input.trim()) return;
        setIsProcessing(true);

        try {
            // Enhanced natural language parsing
            // Expected formats:
            // "University Name"
            // "University Name, PhD"
            // "University Name, PhD in CS"
            // "MIT, MS, Dec 15"
            // "Stanford CS PhD due Dec 1"
            // "Harvard, $75 fee, Dec 1"
            // "MIT PhD CS #dream Dec 15"

            const text = input.trim();
            let universityName = '';
            let programType = ProgramType.PhD;
            let programName = '';
            let deadline: string | null = null;
            let department = '';
            let applicationFee = 0;
            const tags: string[] = [];

            // Extract tags (words starting with #)
            const tagMatches = text.match(/#(\w+)/g);
            if (tagMatches) {
                tagMatches.forEach(tag => tags.push(tag.substring(1)));
            }

            // Remove tags from text for parsing
            let cleanText = text.replace(/#\w+/g, '').trim();

            // Try to extract fee (e.g., "$75", "$100 fee", "fee: $50")
            const feeMatches = cleanText.match(/\$(\d+)/i);
            if (feeMatches) {
                applicationFee = parseInt(feeMatches[1], 10);
                cleanText = cleanText.replace(/\$\d+/i, '').trim();
            }

            // Split by commas or common separators
            const parts = cleanText.split(/[,|]/).map(p => p.trim()).filter(Boolean);
            
            if (parts.length === 0) return;
            
            universityName = parts[0];

            // Parse remaining parts
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                const lowerPart = part.toLowerCase();

                // Check for program type
                if (lowerPart.includes('phd') || lowerPart.includes('doctorate') || lowerPart.includes('ph.d')) {
                    programType = ProgramType.PhD;
                } else if (lowerPart.includes('ms') || lowerPart.includes('m.s') || lowerPart.includes('master')) {
                    programType = ProgramType.Masters;
                } else if (lowerPart.includes('bachelor') || lowerPart.includes('bs') || lowerPart.includes('b.s')) {
                    programType = ProgramType.Bachelors;
                } else if (lowerPart.includes('postdoc') || lowerPart.includes('post-doc')) {
                    programType = ProgramType.Postdoc;
                }

                // Check for department/program (e.g., "in CS", "CS", "Computer Science")
                if (lowerPart.startsWith('in ')) {
                    const dept = part.substring(3);
                    programName = dept;
                    department = dept;
                } else if (part.length > 0 && !part.match(/\d/) && !lowerPart.includes('dec') && !lowerPart.includes('jan') && !lowerPart.includes('feb')) {
                    // Likely a department if it's not a date and not already set
                    if (!programName) {
                        programName = part;
                        department = part;
                    }
                }

                // Enhanced date parsing
                const datePatterns = [
                    /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+(\d{1,2})\b/i,
                    /\b(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/i,
                    /\b(\d{1,2})\/(\d{1,2})\b/,
                    /\b(\d{4}-\d{2}-\d{2})\b/,
                ];

                for (const pattern of datePatterns) {
                    const match = part.match(pattern);
                    if (match) {
                        let dateStr = match[0];
                        // Try to parse the date
                        const date = new Date(dateStr + " " + new Date().getFullYear());
                        if (!isNaN(date.getTime())) {
                            // If date is in the past, assume next year
                            if (date < new Date()) {
                                date.setFullYear(date.getFullYear() + 1);
                            }
                            deadline = date.toISOString().split('T')[0];
                            break;
                        }
                    }
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
                applicationFee: applicationFee || 0,
                tags: tags.length > 0 ? tags : undefined,
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
                        className="fixed inset-0 liquid-glass-modal"
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
                        <div className="liquid-glass-modal-content rounded-2xl overflow-hidden">
                            <div className="p-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-[#F5D7DA] mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#C03050]">bolt</span>
                                    Quick Capture
                                </h3>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="e.g. Stanford University, PhD in CS, Dec 15"
                                    className="w-full text-xl bg-transparent border-b-2 border-[#E8B4B8]/30 focus:border-[#C03050] focus:outline-none py-2 px-1 text-[#F5D7DA] placeholder:text-[#E8B4B8]/50"
                                    autoComplete="off"
                                    disabled={isProcessing}
                                />

                                <div className="flex justify-between items-center mt-4 text-xs text-[#E8B4B8]/70">
                                    <div className="flex gap-4">
                                        <span>Hit <kbd className="font-mono liquid-glass px-1 rounded">Enter</kbd> to save</span>
                                        <span><kbd className="font-mono liquid-glass px-1 rounded">Esc</kbd> to close</span>
                                    </div>
                                    {isProcessing && (
                                        <div className="flex items-center gap-2 text-[#C03050]">
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
