import React, { useState } from 'react';
import { Application, FacultyContactStatus } from '../types';
import { FACULTY_CONTACT_STATUS_COLORS, FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';
import { FieldSet, Input, Select, TextArea, MaterialIcon, formCardClass, formSectionDivider, formSubheadingClass, formLabelUpperClass, formInputSmClass, formActionBtnClass, formDashedAddClass } from './ApplicationFormUI';
import MarkdownEditor from './MarkdownEditor';

interface FacultyContactsSectionProps {
    appData: Omit<Application, 'id'>;
    isFacultyOpen: boolean[];
    setIsFacultyOpen: React.Dispatch<React.SetStateAction<boolean[]>>;
    handleFacultyChange: (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    removeFacultyContact: (index: number) => void;
    handleFacultyMarkdownChange: (index: number, field: string, value: string) => void;
    addFacultyContact: () => void;
    handleFacultyFitChange: (index: number, field: 'fitScore' | 'fitNotes', value: any) => void;
    addPaperRead: (index: number, paper: string) => void;
    removePaperRead: (facultyIndex: number, paperIndex: number) => void;
    addCorrespondence: (index: number, correspondence: any) => void;
    removeCorrespondence: (facultyIndex: number, correspondenceId: string | number) => void;
}

const FacultyContactsSection: React.FC<FacultyContactsSectionProps> = ({
    appData,
    isFacultyOpen,
    setIsFacultyOpen,
    handleFacultyChange,
    removeFacultyContact,
    handleFacultyMarkdownChange,
    addFacultyContact,
    handleFacultyFitChange,
    addPaperRead,
    removePaperRead,
    addCorrespondence,
    removeCorrespondence
}) => {
    const [newPaper, setNewPaper] = useState<{ [key: number]: string }>({});
    const [newCorrespondence, setNewCorrespondence] = useState<{ [key: number]: any }>({});

    const handleAddPaper = (index: number) => {
        if (newPaper[index]) {
            addPaperRead(index, newPaper[index]);
            setNewPaper(prev => ({ ...prev, [index]: '' }));
        }
    };

    const handleAddCorrespondence = (index: number) => {
        const current = newCorrespondence[index] || { type: 'Email Sent', subject: '', notes: '', date: new Date().toISOString().split('T')[0] };
        if (current.subject) {
            addCorrespondence(index, current);
            setNewCorrespondence(prev => ({ ...prev, [index]: { type: 'Email Sent', subject: '', notes: '', date: new Date().toISOString().split('T')[0] } }));
        }
    };

    return (
        <FieldSet legend="Faculty Contacts">
            <div className="md:col-span-2 space-y-2">
                {appData.facultyContacts.map((faculty, index) => {
                    const isExpanded = isFacultyOpen[index] || false;
                    return (
                    <div key={faculty.id} className={`${formCardClass} overflow-hidden`}>
                        <div className="flex items-center p-2">
                            <button type="button" onClick={() => setIsFacultyOpen(p => p.map((s, i) => i === index ? !s : s))} className="flex-grow flex items-center gap-2 text-left" aria-expanded={isExpanded}>
                                <MaterialIcon name="expand_more" className={`transition-transform transform ${isExpanded ? 'rotate-180' : ''}`} />
                                <span className="font-medium text-sm text-[#f4f4f5] truncate">{faculty.name || `Faculty Contact #${index + 1}`}</span>
                            </button>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${FACULTY_CONTACT_STATUS_COLORS[faculty.contactStatus]}`}>{faculty.contactStatus}</span>
                            <button type="button" onClick={() => removeFacultyContact(index)} className="ml-2 p-1.5 rounded-full text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={`Remove contact`}>
                                <MaterialIcon name="delete" className="text-base" />
                            </button>
                        </div>
                        {isExpanded && (
                            <div className={`p-4 ${formSectionDivider} space-y-6`}>
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Name" name="name" value={faculty.name} onChange={e => handleFacultyChange(index, e)} />
                                    <Input label="Email" name="email" type="email" value={faculty.email} onChange={e => handleFacultyChange(index, e)} />
                                    <Input label="Website URL" name="website" type="url" value={faculty.website} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                                </div>
                                <TextArea label="Research Area" name="researchArea" value={faculty.researchArea} onChange={e => handleFacultyChange(index, e)} rows={2} />
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${formSectionDivider} pt-4`}>
                                    <Select label="Contact Status" name="contactStatus" value={faculty.contactStatus} onChange={e => handleFacultyChange(index, e)}>
                                        {FACULTY_CONTACT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </Select>
                                    <Input label="Contact Date" name="contactDate" type="date" value={faculty.contactDate || ''} onChange={e => handleFacultyChange(index, e)} disabled={faculty.contactStatus === FacultyContactStatus.NotContacted} />
                                    {faculty.contactStatus === FacultyContactStatus.MeetingScheduled && (
                                        <Input label="Interview Date" name="interviewDate" type="date" value={faculty.interviewDate || ''} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                                    )}
                                </div>

                                {/* Research Fit */}
                                <div className={`pt-4 ${formSectionDivider}`}>
                                    <h4 className={formSubheadingClass}>
                                        <MaterialIcon name="science" className="text-blue-500" />
                                        Research Fit
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor={`fit-score-${index}`} className={formLabelUpperClass}>Fit Score (1-10)</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    id={`fit-score-${index}`}
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={faculty.fitScore || 5}
                                                    onChange={e => handleFacultyFitChange(index, 'fitScore', parseInt(e.target.value))}
                                                    className="w-full h-2 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-[#dc2626]"
                                                />
                                                <span className="text-lg font-bold text-blue-400 w-8 text-center">{faculty.fitScore || 5}</span>
                                            </div>
                                        </div>
                                        <MarkdownEditor
                                            label="Fit Notes (Why this lab?)"
                                            value={faculty.fitNotes || ''}
                                            onChange={val => handleFacultyFitChange(index, 'fitNotes', val)}
                                        />
                                        <div>
                                            <label className="block text-xs font-medium text-[#a1a1aa] uppercase mb-2">Papers Read</label>
                                            <div className="space-y-2">
                                                {faculty.papersRead?.map((paper, pIndex) => (
                                                    <div key={pIndex} className="flex items-center justify-between bg-[#18181b] p-2 rounded border border-[#27272a]">
                                                        <span className="text-sm text-[#a1a1aa] truncate">{paper}</span>
                                                        <button type="button" onClick={() => removePaperRead(index, pIndex)} className="text-[#a1a1aa] hover:text-red-500" aria-label={`Remove paper: ${paper}`}>
                                                            <MaterialIcon name="close" className="text-sm" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newPaper[index] || ''}
                                                        onChange={e => setNewPaper(prev => ({ ...prev, [index]: e.target.value }))}
                                                        placeholder="Paper Title / Link"
                                                        className={`flex-grow ${formInputSmClass}`}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPaper(index))}
                                                    />
                                                    <button type="button" onClick={() => handleAddPaper(index)} className={formActionBtnClass}>Add</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Correspondence History */}
                                <div className={`pt-4 ${formSectionDivider}`}>
                                    <h4 className={formSubheadingClass}>
                                        <MaterialIcon name="history" className="text-purple-500" />
                                        Correspondence History
                                    </h4>
                                    <div className="space-y-4">
                                        {faculty.correspondence?.map((corr, cIndex) => (
                                            <div key={corr.id} className="bg-[#18181b] p-3 rounded border border-[#27272a] text-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-medium ${corr.type === 'Email Sent' ? 'text-blue-400' : corr.type === 'Email Received' ? 'text-green-400' : 'text-[#a1a1aa]'}`}>
                                                        {corr.type}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[#a1a1aa] text-xs">{corr.date}</span>
                                                        <button type="button" onClick={() => removeCorrespondence(index, corr.id)} className="text-[#a1a1aa] hover:text-red-500" aria-label={`Remove correspondence: ${corr.subject}`}>
                                                            <MaterialIcon name="delete" className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="font-medium text-[#f4f4f5]">{corr.subject}</p>
                                                {corr.notes && <p className="text-[#a1a1aa] mt-1">{corr.notes}</p>}
                                            </div>
                                        ))}
                                        <div className="bg-[#09090b] p-3 rounded border border-dashed border-[#27272a] space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label htmlFor={`correspondence-type-${index}`} className="sr-only">Correspondence Type</label>
                                                    <select
                                                        id={`correspondence-type-${index}`}
                                                        value={newCorrespondence[index]?.type || 'Email Sent'}
                                                        onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], type: e.target.value } }))}
                                                        className="px-2 py-1.5 text-sm bg-[#18181b] border border-[#27272a] rounded"
                                                    >
                                                        <option>Email Sent</option>
                                                        <option>Email Received</option>
                                                        <option>Meeting</option>
                                                        <option>Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`correspondence-date-${index}`} className="sr-only">Correspondence Date</label>
                                                    <input
                                                        id={`correspondence-date-${index}`}
                                                        type="date"
                                                        value={newCorrespondence[index]?.date || new Date().toISOString().split('T')[0]}
                                                        onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], date: e.target.value } }))}
                                                        className="px-2 py-1.5 text-sm bg-[#18181b] border border-[#27272a] rounded"
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Subject / Topic"
                                                value={newCorrespondence[index]?.subject || ''}
                                                onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], subject: e.target.value } }))}
                                                className="w-full px-2 py-1.5 text-sm bg-[#18181b] border border-[#27272a] rounded"
                                            />
                                            <textarea
                                                placeholder="Notes..."
                                                rows={2}
                                                value={newCorrespondence[index]?.notes || ''}
                                                onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], notes: e.target.value } }))}
                                                className="w-full px-2 py-1.5 text-sm bg-[#18181b] border border-[#27272a] rounded resize-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddCorrespondence(index)}
                                                disabled={!newCorrespondence[index]?.subject}
                                                className={`w-full ${formActionBtnClass}`}
                                            >
                                                Log Correspondence
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Interview Prep */}
                                <div className={`pt-4 ${formSectionDivider}`}>
                                    <h4 className={formSubheadingClass}>
                                        <MaterialIcon name="mic" className="text-orange-500" />
                                        Interview Preparation
                                    </h4>
                                    <div className="space-y-4">
                                        <MarkdownEditor
                                            label="Interview Notes"
                                            value={faculty.interviewNotes || ''}
                                            onChange={val => handleFacultyMarkdownChange(index, 'interviewNotes', val)}
                                        />
                                        <MarkdownEditor
                                            label="Potential Questions"
                                            value={faculty.questions || ''}
                                            onChange={val => handleFacultyMarkdownChange(index, 'questions', val)}
                                        />
                                        <MarkdownEditor
                                            label="Your Answers"
                                            value={faculty.answers || ''}
                                            onChange={val => handleFacultyMarkdownChange(index, 'answers', val)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })}
                {appData.facultyContacts.length < 3 && (
                    <button type="button" onClick={addFacultyContact} className={formDashedAddClass}>
                        <MaterialIcon name="add" /><span>Add Faculty Contact</span>
                    </button>
                )}
            </div>
        </FieldSet>
    );
};

export default FacultyContactsSection;
