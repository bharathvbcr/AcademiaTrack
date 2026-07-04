import React, { useState } from 'react';
import { Application, Essay, EssayDraft } from '../types';
import { ESSAY_STATUS_COLORS } from '../constants';
import { FieldSet, MaterialIcon, formInputSmClass, formPrimaryBtnClass, formActionBtnClass } from './ApplicationFormUI';

interface EssaysSectionProps {
    appData: Omit<Application, 'id'>;
    addEssay: (type: Essay['type'], name: string) => void;
    removeEssay: (essayId: string | number) => void;
    updateEssayStatus: (essayId: string | number, status: Essay['status']) => void;
    addEssayDraft: (essayId: string | number, draft: Omit<EssayDraft, 'id'>) => void;
    removeEssayDraft: (essayId: string | number, draftId: string | number) => void;
    updateEssayDraft: (essayId: string | number, draftId: string | number, field: keyof EssayDraft, value: any) => void;
    handleAttachEssayDraftFile: (essayId: string | number, draftId: string | number) => void;
    handleOpenEssayDraftFile: (filePath: string) => void;
    handleRemoveEssayDraftFile: (essayId: string | number, draftId: string | number, filePath: string) => void;
}

const EssaysSection: React.FC<EssaysSectionProps> = ({
    appData,
    addEssay,
    removeEssay,
    updateEssayStatus,
    addEssayDraft,
    removeEssayDraft,
    updateEssayDraft,
    handleAttachEssayDraftFile,
    handleOpenEssayDraftFile,
    handleRemoveEssayDraftFile
}) => {
    const [openEssays, setOpenEssays] = useState<{ [key: string]: boolean }>({});
    const [newDrafts, setNewDrafts] = useState<{ [key: string]: Partial<EssayDraft> }>({});

    const toggleEssay = (id: string | number) => {
        setOpenEssays(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddDraft = (essayId: string | number) => {
        const draft = newDrafts[essayId];
        if (draft && draft.version && draft.wordCount !== undefined) {
            addEssayDraft(essayId, {
                version: draft.version,
                date: draft.date || new Date().toISOString().split('T')[0],
                wordCount: draft.wordCount,
                notes: draft.notes || '',
                filePath: draft.filePath
            });
            setNewDrafts(prev => ({ ...prev, [essayId]: {} }));
        }
    };

    const handleNewDraftChange = (essayId: string | number, field: keyof EssayDraft, value: any) => {
        setNewDrafts(prev => ({
            ...prev,
            [essayId]: { ...prev[essayId], [field]: value }
        }));
    };

    return (
        <FieldSet legend="SOP & Essays">
            <div className="md:col-span-2 space-y-4">
                {appData.essays?.map((essay) => (
                    <div key={essay.id} className="bg-[#09090b] rounded-xl border border-[#27272a] overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-[#09090b] cursor-pointer" onClick={() => toggleEssay(essay.id)}>
                            <div className="flex items-center gap-3">
                                <MaterialIcon name="expand_more" className={`transition-transform transform ${openEssays[essay.id] ? 'rotate-180' : ''}`} />
                                <div>
                                    <h4 className="font-semibold text-[#f4f4f5]">{essay.name}</h4>
                                    <span className="text-xs text-[#a1a1aa]">{essay.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={essay.status}
                                    onChange={(e) => updateEssayStatus(essay.id, e.target.value as any)}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Status for ${essay.name}`}
                                    className={`text-xs font-medium px-2 py-1 rounded-full border ${ESSAY_STATUS_COLORS[essay.status]}`}
                                >
                                    <option value="Not Started">Not Started</option>
                                    <option value="Drafting">Drafting</option>
                                    <option value="Finalized">Finalized</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeEssay(essay.id); }}
                                    aria-label={`Remove ${essay.name}`}
                                    className="text-[#a1a1aa] hover:text-red-500 transition-colors"
                                >
                                    <MaterialIcon name="delete" />
                                </button>
                            </div>
                        </div>

                        {openEssays[essay.id] && (
                            <div className="p-4 space-y-4">
                                {/* Drafts List */}
                                {essay.drafts.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-[#a1a1aa]">
                                            <thead className="text-xs text-[#a1a1aa] uppercase bg-[#27272a]">
                                                <tr>
                                                    <th className="px-4 py-2">Ver</th>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Words</th>
                                                    <th className="px-4 py-2">Notes</th>
                                                    <th className="px-4 py-2">File</th>
                                                    <th className="px-4 py-2">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {essay.drafts.map((draft) => (
                                                    <tr key={draft.id} className="bg-[#18181b] border-b border-[#27272a]">
                                                        <td className="px-4 py-2 font-medium text-[#f4f4f5]">v{draft.version}</td>
                                                        <td className="px-4 py-2">{draft.date}</td>
                                                        <td className="px-4 py-2">{draft.wordCount}</td>
                                                        <td className="px-4 py-2 truncate max-w-xs">{draft.notes}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="flex items-center gap-1">
                                                                {draft.filePath ? (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenEssayDraftFile(draft.filePath!)}
                                                                            className={`${formActionBtnClass} p-1`}
                                                                            aria-label={`Open draft file version ${draft.version}`}
                                                                            title="Open file"
                                                                        >
                                                                            <MaterialIcon name="visibility" className="text-base" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveEssayDraftFile(essay.id, draft.id, draft.filePath!)}
                                                                            className="p-1 text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                                            aria-label={`Remove file from draft version ${draft.version}`}
                                                                        >
                                                                            <MaterialIcon name="close" className="text-base" />
                                                                        </button>
                                                                    </>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAttachEssayDraftFile(essay.id, draft.id)}
                                                                        className="p-1 text-[#a1a1aa] hover:text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded transition-colors"
                                                                        aria-label={`Attach file to draft version ${draft.version}`}
                                                                        title="Attach file"
                                                                    >
                                                                        <MaterialIcon name="attach_file" className="text-base" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEssayDraft(essay.id, draft.id)}
                                                                aria-label={`Remove draft version ${draft.version}`}
                                                                className="text-red-400 hover:text-red-300"
                                                            >
                                                                <MaterialIcon name="delete" className="text-base" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-[#a1a1aa] italic text-center py-2">No drafts yet.</p>
                                )}

                                {/* Add Draft Form */}
                                <div className="bg-[#09090b] p-3 rounded-lg border border-dashed border-[#27272a]">
                                    <h5 className="text-xs font-semibold uppercase text-[#a1a1aa] mb-2">Add New Draft</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Ver #"
                                            value={newDrafts[essay.id]?.version || (essay.drafts.length + 1)}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'version', parseInt(e.target.value))}
                                            className={formInputSmClass}
                                        />
                                        <input
                                            type="date"
                                            value={newDrafts[essay.id]?.date || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'date', e.target.value)}
                                            aria-label="Draft date"
                                            className={formInputSmClass}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Word Count"
                                            value={newDrafts[essay.id]?.wordCount || ''}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'wordCount', parseInt(e.target.value))}
                                            className={formInputSmClass}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Notes"
                                            value={newDrafts[essay.id]?.notes || ''}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'notes', e.target.value)}
                                            className={formInputSmClass}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAddDraft(essay.id)}
                                        className={`mt-2 w-full py-1.5 text-sm ${formPrimaryBtnClass}`}
                                    >
                                        Add Draft
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add Essay Button */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => addEssay('SOP', 'Statement of Purpose')}
                        className="flex-1 py-2 text-sm font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors"
                    >
                        + Add SOP
                    </button>
                    <button
                        type="button"
                        onClick={() => addEssay('Personal History', 'Personal History Statement')}
                        className="flex-1 py-2 text-sm font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 transition-colors"
                    >
                        + Add Personal History
                    </button>
                    <button
                        type="button"
                        onClick={() => addEssay('Diversity Statement', 'Diversity Statement')}
                        className="flex-1 py-2 text-sm font-medium text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 rounded-lg border border-pink-500/30 transition-colors"
                    >
                        + Add Diversity Stmt
                    </button>
                </div>
            </div>
        </FieldSet>
    );
};

export default EssaysSection;
