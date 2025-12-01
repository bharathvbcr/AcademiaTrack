import React from 'react';
import {
    Application,
    StipendFrequency,
    HealthInsuranceCoverage,
    AssistantshipType,
    ScholarshipStatus,
    FinancialOffer,
    Scholarship
} from '../types';
import { MaterialIcon } from './ApplicationFormUI';

interface FinancialsSectionProps {
    appData: Application;
    handleFinancialOfferChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleFinancialNumericChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFinancialCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    addScholarship: () => void;
    removeScholarship: (index: number) => void;
    handleScholarshipChange: (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    isScholarshipOpen: boolean[];
    setIsScholarshipOpen: React.Dispatch<React.SetStateAction<boolean[]>>;
}

const FinancialsSection: React.FC<FinancialsSectionProps> = ({
    appData,
    handleFinancialOfferChange,
    handleFinancialNumericChange,
    handleFinancialCheckboxChange,
    addScholarship,
    removeScholarship,
    handleScholarshipChange,
    isScholarshipOpen,
    setIsScholarshipOpen
}) => {
    const offer = appData.financialOffer || {
        received: false,
        stipendAmount: 0,
        stipendFrequency: StipendFrequency.Yearly,
        tuitionWaiver: 0,
        healthInsurance: HealthInsuranceCoverage.None,
        assistantship: AssistantshipType.None,
        assistantshipHours: 0,
        notes: ''
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 pb-2">
                <MaterialIcon name="attach_money" className="text-2xl text-green-500" />
                <h4 className="text-lg font-semibold">Funding & Financials</h4>
            </div>

            {/* Financial Offer Section */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="offerReceived"
                        name="received"
                        checked={offer.received}
                        onChange={handleFinancialCheckboxChange}
                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                    />
                    <label htmlFor="offerReceived" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Financial Offer Received
                    </label>
                </div>

                {offer.received && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Stipend Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                <input
                                    type="number"
                                    name="stipendAmount"
                                    value={offer.stipendAmount}
                                    onChange={handleFinancialNumericChange}
                                    className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Frequency</label>
                            <select
                                name="stipendFrequency"
                                value={offer.stipendFrequency}
                                onChange={handleFinancialOfferChange}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                            >
                                {Object.values(StipendFrequency).map(freq => (
                                    <option key={freq} value={freq}>{freq}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Tuition Waiver (%)</label>
                            <input
                                type="number"
                                name="tuitionWaiver"
                                value={offer.tuitionWaiver}
                                onChange={handleFinancialNumericChange}
                                min="0"
                                max="100"
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Health Insurance</label>
                            <select
                                name="healthInsurance"
                                value={offer.healthInsurance}
                                onChange={handleFinancialOfferChange}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                            >
                                {Object.values(HealthInsuranceCoverage).map(cov => (
                                    <option key={cov} value={cov}>{cov}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Assistantship Type</label>
                            <select
                                name="assistantship"
                                value={offer.assistantship}
                                onChange={handleFinancialOfferChange}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                            >
                                {Object.values(AssistantshipType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {offer.assistantship !== AssistantshipType.None && (
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Hours / Week</label>
                                <input
                                    type="number"
                                    name="assistantshipHours"
                                    value={offer.assistantshipHours}
                                    onChange={handleFinancialNumericChange}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                />
                            </div>
                        )}

                        <div className="col-span-1 md:col-span-2 space-y-1">
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Offer Notes</label>
                            <textarea
                                name="notes"
                                value={offer.notes}
                                onChange={handleFinancialOfferChange}
                                rows={2}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200 resize-none"
                                placeholder="Any additional details about the offer..."
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Scholarships Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scholarships & Grants</h5>
                    <button
                        type="button"
                        onClick={addScholarship}
                        className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center space-x-1"
                    >
                        <MaterialIcon name="add" className="text-lg" />
                        <span>Add Scholarship</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {appData.scholarships?.map((scholarship, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 cursor-pointer"
                                onClick={() => setIsScholarshipOpen(prev => {
                                    const newState = [...prev];
                                    newState[index] = !newState[index];
                                    return newState;
                                })}
                            >
                                <div className="flex items-center space-x-3">
                                    <MaterialIcon name="school" className="text-slate-400" />
                                    <span className="font-medium text-slate-700 dark:text-slate-200">
                                        {scholarship.name || 'New Scholarship'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${scholarship.status === ScholarshipStatus.Awarded ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                        scholarship.status === ScholarshipStatus.Rejected ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        }`}>
                                        {scholarship.status}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <MaterialIcon name={isScholarshipOpen[index] ? 'expand_less' : 'expand_more'} className="text-slate-400" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeScholarship(index);
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <MaterialIcon name="delete" />
                                    </button>
                                </div>
                            </div>

                            {isScholarshipOpen[index] && (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Name</label>
                                        <input
                                            type="text"
                                            value={scholarship.name}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="name"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                            placeholder="Scholarship Name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                            <input
                                                type="number"
                                                value={scholarship.amount}
                                                onChange={(e) => handleScholarshipChange(index, e)}
                                                name="amount"
                                                className="w-full pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Status</label>
                                        <select
                                            value={scholarship.status}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="status"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                        >
                                            {Object.values(ScholarshipStatus).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Duration</label>
                                        <input
                                            type="text"
                                            value={scholarship.duration}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="duration"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                            placeholder="e.g. 1 Year, Renewable"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Link</label>
                                        <input
                                            type="text"
                                            value={scholarship.link}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="link"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Deadline</label>
                                        <input
                                            type="date"
                                            value={scholarship.deadline || ''}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="deadline"
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200"
                                        />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-1">
                                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Notes</label>
                                        <textarea
                                            value={scholarship.notes}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="notes"
                                            rows={2}
                                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-slate-200 resize-none"
                                            placeholder="Requirements, essays, etc."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {(!appData.scholarships || appData.scholarships.length === 0) && (
                        <div className="text-center py-6 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            No scholarships added yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialsSection;
