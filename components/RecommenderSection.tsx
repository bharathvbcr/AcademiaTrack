import React from 'react';
import { Application, Recommender, RecommenderStatus } from '../types';
import { FieldSet, Input, Select, TextArea, MaterialIcon } from './ApplicationFormUI';

interface RecommenderSectionProps {
    appData: Omit<Application, 'id'>;
    handleRecommenderChange: (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    addRecommender: () => void;
    removeRecommender: (index: number) => void;
    isRecommenderOpen: boolean[];
    setIsRecommenderOpen: React.Dispatch<React.SetStateAction<boolean[]>>;
}

const RecommenderSection: React.FC<RecommenderSectionProps> = ({
    appData,
    handleRecommenderChange,
    addRecommender,
    removeRecommender,
    isRecommenderOpen,
    setIsRecommenderOpen
}) => {
    const toggleRecommender = (index: number) => {
        setIsRecommenderOpen(prev => {
            const newState = [...prev];
            newState[index] = !newState[index];
            return newState;
        });
    };

    return (
        <FieldSet legend="Letters of Recommendation">
            <div className="space-y-4">
                {appData.recommenders?.map((recommender, index) => (
                    <div key={recommender.id} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                        <div
                            className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                            onClick={() => toggleRecommender(index)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${recommender.status === RecommenderStatus.Submitted ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    <MaterialIcon name="school" className="text-xl" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-900 dark:text-white">{recommender.name || 'New Recommender'}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{recommender.title || 'No Title'} • {recommender.status}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeRecommender(index); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                >
                                    <MaterialIcon name="delete" className="text-lg" />
                                </button>
                                <MaterialIcon name={isRecommenderOpen[index] ? 'expand_less' : 'expand_more'} className="text-slate-400" />
                            </div>
                        </div>

                        {isRecommenderOpen[index] && (
                            <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Recommender Name"
                                        name="name"
                                        value={recommender.name}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                        placeholder="e.g. Prof. Jane Doe"
                                    />
                                    <Input
                                        label="Title / Position"
                                        name="title"
                                        value={recommender.title}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                        placeholder="e.g. Associate Professor"
                                    />
                                    <Input
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={recommender.email}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                        placeholder="jane.doe@university.edu"
                                    />
                                    <Input
                                        label="Relationship"
                                        name="relationship"
                                        value={recommender.relationship}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                        placeholder="e.g. Research Advisor, Course Instructor"
                                    />
                                    <Select
                                        label="Status"
                                        name="status"
                                        value={recommender.status}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                    >
                                        {Object.values(RecommenderStatus).map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </Select>
                                    <Input
                                        label="Date Requested"
                                        name="dateRequested"
                                        type="date"
                                        value={recommender.dateRequested || ''}
                                        onChange={(e) => handleRecommenderChange(index, e)}
                                        className="[color-scheme:light_dark]"
                                    />
                                    {recommender.status === RecommenderStatus.Submitted && (
                                        <Input
                                            label="Date Submitted"
                                            name="dateSubmitted"
                                            type="date"
                                            value={recommender.dateSubmitted || ''}
                                            onChange={(e) => handleRecommenderChange(index, e)}
                                            className="[color-scheme:light_dark]"
                                        />
                                    )}
                                </div>
                                <TextArea
                                    label="Notes"
                                    name="notes"
                                    value={recommender.notes}
                                    onChange={(e) => handleRecommenderChange(index, e)}
                                    placeholder="Any specific points to mention, or reminders sent..."
                                    rows={2}
                                />
                            </div>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addRecommender}
                    className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
                >
                    <MaterialIcon name="add" />
                    Add Recommender
                </button>
            </div>
        </FieldSet>
    );
};

export default RecommenderSection;
