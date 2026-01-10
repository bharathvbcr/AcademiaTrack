import React from 'react';
import { Application, DocumentStatus } from '../types';
import { DOCUMENT_LABELS, DOCUMENT_STATUS_COLORS, DOCUMENT_STATUS_OPTIONS } from '../constants';
import { FieldSet, MaterialIcon } from './ApplicationFormUI';

interface DocumentsSectionProps {
    appData: Omit<Application, 'id'>;
    handleDocumentChange: (docKey: keyof Application['documents'], field: 'required' | 'status' | 'submitted', value: any) => void;
    handleOpenFile: (filePath: string) => void;
    handleRemoveFile: (docKey: keyof Application['documents']) => void;
    handleAttachFile: (docKey: keyof Application['documents']) => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
    appData,
    handleDocumentChange,
    handleOpenFile,
    handleRemoveFile,
    handleAttachFile,
}) => {
    return (
        <FieldSet legend="Required Documents">
            <div className="md:col-span-2 space-y-3">
                {Object.keys(appData.documents).map(key => {
                    const docKey = key as keyof typeof appData.documents;
                    const doc = appData.documents[docKey];

                    return (
                        <div key={key} className="grid grid-cols-1 sm:grid-cols-[1.5fr,1fr,auto] gap-3 items-center p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <input
                                    id={`${key}-required`}
                                    type="checkbox"
                                    checked={doc.required}
                                    onChange={e => handleDocumentChange(docKey, 'required', e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-400 text-red-600 focus:ring-red-500"
                                />
                                <label htmlFor={`${key}-status`} className={`font-medium ${!doc.required ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {DOCUMENT_LABELS[docKey]}
                                </label>
                            </div>

                            <select
                                id={`${key}-status`}
                                value={doc.status}
                                onChange={e => handleDocumentChange(docKey, 'status', e.target.value)}
                                disabled={!doc.required}
                                className={`w-full px-2 py-1.5 text-xs font-medium rounded-md border border-slate-300 dark:border-slate-600 shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition ${DOCUMENT_STATUS_COLORS[doc.status]}`}
                                aria-label={`${DOCUMENT_LABELS[docKey]} status`}
                            >
                                {DOCUMENT_STATUS_OPTIONS.map(status => (
                                    <option key={status} value={status} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={doc.submitted || ''}
                                onChange={e => handleDocumentChange(docKey, 'submitted', e.target.value)}
                                disabled={!doc.required || doc.status !== DocumentStatus.Submitted}
                                className="w-full sm:w-36 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition text-sm [color-scheme:light_dark] disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`${DOCUMENT_LABELS[docKey]} submission date`}
                                title={doc.status !== DocumentStatus.Submitted ? "Select 'Submitted' status to set date" : "Submission Date"}
                            />

                            <div className="flex items-center gap-1">
                                {doc.filePath ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenFile(doc.filePath!)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                            title={`Open ${doc.filePath}`}
                                        >
                                            <MaterialIcon name="visibility" className="text-lg" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(docKey)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                            title="Remove attachment"
                                        >
                                            <MaterialIcon name="close" className="text-lg" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleAttachFile(docKey)}
                                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                        title="Attach file"
                                    >
                                        <MaterialIcon name="attach_file" className="text-lg" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </FieldSet>
    );
};

export default DocumentsSection;
