import React from 'react';
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
}

const FacultyContactsSection: React.FC<FacultyContactsSectionProps> = ({
    appData,
    isFacultyOpen,
    setIsFacultyOpen,
    handleFacultyChange,
    removeFacultyContact,
    handleFacultyMarkdownChange,
    addFacultyContact,
}) => {
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
                            <div className="p-4 border-t border-slate-200 dark:border-slate-600 space-y-4">
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

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Interview Preparation</h4>
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
