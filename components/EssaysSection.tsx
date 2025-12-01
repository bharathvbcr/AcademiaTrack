import React, { useState } from 'react';
import { Application, Essay, EssayDraft } from '../types';
import { FieldSet, MaterialIcon } from './ApplicationFormUI';

interface EssaysSectionProps {
    appData: Omit<Application, 'id'>;
    addEssay: (type: Essay['type'], name: string) => void;
    removeEssay: (essayId: string | number) => void;
    updateEssayStatus: (essayId: string | number, status: Essay['status']) => void;
    addEssayDraft: (essayId: string | number, draft: Omit<EssayDraft, 'id'>) => void;
    removeEssayDraft: (essayId: string | number, draftId: string | number) => void;
    updateEssayDraft: (essayId: string | number, draftId: string | number, field: keyof EssayDraft, value: any) => void;
}

const EssaysSection: React.FC<EssaysSectionProps> = ({
    appData,
    addEssay,
    removeEssay,
    updateEssayStatus,
    addEssayDraft,
    removeEssayDraft,
    updateEssayDraft
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
                    <div key={essay.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-700/50 cursor-pointer" onClick={() => toggleEssay(essay.id)}>
                            <div className="flex items-center gap-3">
                                <MaterialIcon name="expand_more" className={`transition-transform transform ${openEssays[essay.id] ? 'rotate-180' : ''}`} />
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{essay.name}</h4>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{essay.type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <select
                                    value={essay.status}
                                    onChange={(e) => updateEssayStatus(essay.id, e.target.value as any)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`text-xs font-medium px-2 py-1 rounded-full border ${essay.status === 'Finalized' ? 'bg-green-100 text-green-700 border-green-200' :
                                            essay.status === 'Drafting' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}
                                >
                                    <option value="Not Started">Not Started</option>
                                    <option value="Drafting">Drafting</option>
                                    <option value="Finalized">Finalized</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeEssay(essay.id); }}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
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
                                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                                <tr>
                                                    <th className="px-4 py-2">Ver</th>
                                                    <th className="px-4 py-2">Date</th>
                                                    <th className="px-4 py-2">Words</th>
                                                    <th className="px-4 py-2">Notes</th>
                                                    <th className="px-4 py-2">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {essay.drafts.map((draft) => (
                                                    <tr key={draft.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                                        <td className="px-4 py-2 font-medium text-slate-900 dark:text-white">v{draft.version}</td>
                                                        <td className="px-4 py-2">{draft.date}</td>
                                                        <td className="px-4 py-2">{draft.wordCount}</td>
                                                        <td className="px-4 py-2 truncate max-w-xs">{draft.notes}</td>
                                                        <td className="px-4 py-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEssayDraft(essay.id, draft.id)}
                                                                className="text-red-500 hover:text-red-700"
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
                                    <p className="text-sm text-slate-500 italic text-center py-2">No drafts yet.</p>
                                )}

                                {/* Add Draft Form */}
                                <div className="bg-slate-100 dark:bg-slate-700/30 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                                    <h5 className="text-xs font-semibold uppercase text-slate-500 mb-2">Add New Draft</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Ver #"
                                            value={newDrafts[essay.id]?.version || (essay.drafts.length + 1)}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'version', parseInt(e.target.value))}
                                            className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                        />
                                        <input
                                            type="date"
                                            value={newDrafts[essay.id]?.date || new Date().toISOString().split('T')[0]}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'date', e.target.value)}
                                            className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Word Count"
                                            value={newDrafts[essay.id]?.wordCount || ''}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'wordCount', parseInt(e.target.value))}
                                            className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Notes"
                                            value={newDrafts[essay.id]?.notes || ''}
                                            onChange={(e) => handleNewDraftChange(essay.id, 'notes', e.target.value)}
                                            className="px-2 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleAddDraft(essay.id)}
                                        className="mt-2 w-full py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
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
                        className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                    >
                        + Add SOP
                    </button>
                    <button
                        type="button"
                        onClick={() => addEssay('Personal History', 'Personal History Statement')}
                        className="flex-1 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                        + Add Personal History
                    </button>
                    <button
                        type="button"
                        onClick={() => addEssay('Diversity Statement', 'Diversity Statement')}
                        className="flex-1 py-2 text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg border border-pink-200 transition-colors"
                    >
                        + Add Diversity Stmt
                    </button>
                </div>
            </div>
        </FieldSet>
    );
};

export default EssaysSection;
