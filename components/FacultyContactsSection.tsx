import React, { useState } from 'react';
import { Application, FacultyContactStatus } from '../types';
import { FACULTY_CONTACT_STATUS_COLORS, FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';
import { FieldSet, Input, Select, TextArea, MaterialIcon } from './ApplicationFormUI';
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
                {appData.facultyContacts.map((faculty, index) => (
                    <div key={faculty.id} className="bg-slate-100 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center p-2">
                            <button type="button" onClick={() => setIsFacultyOpen(p => p.map((s, i) => i === index ? !s : s))} className="flex-grow flex items-center gap-2 text-left" aria-expanded={isFacultyOpen[index]}>
                                <MaterialIcon name="expand_more" className={`transition-transform transform ${isFacultyOpen[index] ? 'rotate-180' : ''}`} />
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">{faculty.name || `Faculty Contact #${index + 1}`}</span>
                            </button>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border shrink-0 ${FACULTY_CONTACT_STATUS_COLORS[faculty.contactStatus]}`}>{faculty.contactStatus}</span>
                            <button type="button" onClick={() => removeFacultyContact(index)} className="ml-2 p-1.5 rounded-full text-slate-500 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" aria-label={`Remove contact`}>
                                <MaterialIcon name="delete" className="text-base" />
                            </button>
                        </div>
                        {isFacultyOpen[index] && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-600 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input label="Name" name="name" value={faculty.name} onChange={e => handleFacultyChange(index, e)} />
                                    <Input label="Email" name="email" type="email" value={faculty.email} onChange={e => handleFacultyChange(index, e)} />
                                    <Input label="Website URL" name="website" type="url" value={faculty.website} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                                </div>
                                <TextArea label="Research Area" name="researchArea" value={faculty.researchArea} onChange={e => handleFacultyChange(index, e)} rows={2} />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-600 pt-4">
                                    <Select label="Contact Status" name="contactStatus" value={faculty.contactStatus} onChange={e => handleFacultyChange(index, e)}>
                                        {FACULTY_CONTACT_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </Select>
                                    <Input label="Contact Date" name="contactDate" type="date" value={faculty.contactDate || ''} onChange={e => handleFacultyChange(index, e)} disabled={faculty.contactStatus === FacultyContactStatus.NotContacted} />
                                    {faculty.contactStatus === FacultyContactStatus.MeetingScheduled && (
                                        <Input label="Interview Date" name="interviewDate" type="date" value={faculty.interviewDate || ''} onChange={e => handleFacultyChange(index, e)} className="md:col-span-2" />
                                    )}
                                </div>

                                {/* Research Fit */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <MaterialIcon name="science" className="text-blue-500" />
                                        Research Fit
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-1">Fit Score (1-10)</label>
                                            <div className="flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="10"
                                                    value={faculty.fitScore || 5}
                                                    onChange={e => handleFacultyFitChange(index, 'fitScore', parseInt(e.target.value))}
                                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                                                />
                                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-8 text-center">{faculty.fitScore || 5}</span>
                                            </div>
                                        </div>
                                        <MarkdownEditor
                                            label="Fit Notes (Why this lab?)"
                                            value={faculty.fitNotes || ''}
                                            onChange={val => handleFacultyFitChange(index, 'fitNotes', val)}
                                        />
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase mb-2">Papers Read</label>
                                            <div className="space-y-2">
                                                {faculty.papersRead?.map((paper, pIndex) => (
                                                    <div key={pIndex} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600">
                                                        <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{paper}</span>
                                                        <button type="button" onClick={() => removePaperRead(index, pIndex)} className="text-slate-400 hover:text-red-500">
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
                                                        className="flex-grow px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPaper(index))}
                                                    />
                                                    <button type="button" onClick={() => handleAddPaper(index)} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100">Add</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Correspondence History */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                        <MaterialIcon name="history" className="text-purple-500" />
                                        Correspondence History
                                    </h4>
                                    <div className="space-y-4">
                                        {faculty.correspondence?.map((corr, cIndex) => (
                                            <div key={corr.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-600 text-sm">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`font-medium ${corr.type === 'Email Sent' ? 'text-blue-600' : corr.type === 'Email Received' ? 'text-green-600' : 'text-slate-600'}`}>
                                                        {corr.type}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-400 text-xs">{corr.date}</span>
                                                        <button type="button" onClick={() => removeCorrespondence(index, corr.id)} className="text-slate-400 hover:text-red-500">
                                                            <MaterialIcon name="delete" className="text-xs" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{corr.subject}</p>
                                                {corr.notes && <p className="text-slate-500 dark:text-slate-400 mt-1">{corr.notes}</p>}
                                            </div>
                                        ))}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded border border-dashed border-slate-300 dark:border-slate-600 space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <select
                                                    value={newCorrespondence[index]?.type || 'Email Sent'}
                                                    onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], type: e.target.value } }))}
                                                    className="px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                                >
                                                    <option>Email Sent</option>
                                                    <option>Email Received</option>
                                                    <option>Meeting</option>
                                                    <option>Other</option>
                                                </select>
                                                <input
                                                    type="date"
                                                    value={newCorrespondence[index]?.date || new Date().toISOString().split('T')[0]}
                                                    onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], date: e.target.value } }))}
                                                    className="px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Subject / Topic"
                                                value={newCorrespondence[index]?.subject || ''}
                                                onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], subject: e.target.value } }))}
                                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded"
                                            />
                                            <textarea
                                                placeholder="Notes..."
                                                rows={2}
                                                value={newCorrespondence[index]?.notes || ''}
                                                onChange={e => setNewCorrespondence(prev => ({ ...prev, [index]: { ...prev[index], notes: e.target.value } }))}
                                                className="w-full px-2 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded resize-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddCorrespondence(index)}
                                                disabled={!newCorrespondence[index]?.subject}
                                                className="w-full py-1.5 text-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50"
                                            >
                                                Log Correspondence
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Interview Prep */}
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
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
                ))}
                {appData.facultyContacts.length < 3 && (
                    <button type="button" onClick={addFacultyContact} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                        <MaterialIcon name="add" /><span>Add Faculty Contact</span>
                    </button>
                )}
            </div>
        </FieldSet>
    );
};

export default FacultyContactsSection;
