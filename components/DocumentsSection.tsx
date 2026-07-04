import React from 'react';
import { Application, DocumentStatus } from '../types';
import { DOCUMENT_LABELS, DOCUMENT_STATUS_COLORS, DOCUMENT_STATUS_OPTIONS } from '../constants';
import { FieldSet, MaterialIcon, formCheckboxClass } from './ApplicationFormUI';

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
                        <div key={key} className="grid grid-cols-1 sm:grid-cols-[1.5fr,1fr,auto] gap-3 items-center p-3 bg-[#18181b] border border-[#27272a] rounded-lg">
                            <div className="flex items-center gap-3">
                                <input
                                    id={`${key}-required`}
                                    type="checkbox"
                                    checked={doc.required}
                                    onChange={e => handleDocumentChange(docKey, 'required', e.target.checked)}
                                    className={formCheckboxClass}
                                />
                                <label htmlFor={`${key}-status`} className={`font-medium ${!doc.required ? 'text-[#71717a]' : 'text-[#f4f4f5]'}`}>
                                    {DOCUMENT_LABELS[docKey]}
                                </label>
                            </div>

                            <select
                                id={`${key}-status`}
                                value={doc.status}
                                onChange={e => handleDocumentChange(docKey, 'status', e.target.value)}
                                disabled={!doc.required}
                                className={`w-full px-2 py-1.5 text-xs font-medium rounded-md border border-[#27272a] shadow-sm focus:outline-none focus:ring-1 focus:ring-[#dc2626] focus:border-[#dc2626] transition ${DOCUMENT_STATUS_COLORS[doc.status]}`}
                                aria-label={`${DOCUMENT_LABELS[docKey]} status`}
                            >
                                {DOCUMENT_STATUS_OPTIONS.map(status => (
                                    <option key={status} value={status} className="bg-[#18181b] text-[#f4f4f5]">
                                        {status}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="date"
                                value={doc.submitted || ''}
                                onChange={e => handleDocumentChange(docKey, 'submitted', e.target.value)}
                                disabled={!doc.required || doc.status !== DocumentStatus.Submitted}
                                className="w-full sm:w-36 px-2 py-1 liquid-glass-input border border-[#27272a] bg-[#18181b] rounded-md focus:outline-none focus:ring-2 focus:ring-[#dc2626] focus:border-transparent transition text-sm text-[#f4f4f5] [color-scheme:dark] disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label={`${DOCUMENT_LABELS[docKey]} submission date`}
                                title={doc.status !== DocumentStatus.Submitted ? "Select 'Submitted' status to set date" : "Submission Date"}
                            />

                            <div className="flex items-center gap-1">
                                {doc.filePath ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenFile(doc.filePath!)}
                                            className="p-1.5 text-[#a1a1aa] hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                                            title={`Open ${doc.filePath}`}
                                        >
                                            <MaterialIcon name="visibility" className="text-lg" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(docKey)}
                                            className="p-1.5 text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                                            title="Remove attachment"
                                        >
                                            <MaterialIcon name="close" className="text-lg" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleAttachFile(docKey)}
                                        className="p-1.5 text-[#a1a1aa] hover:text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded-full transition-colors"
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
