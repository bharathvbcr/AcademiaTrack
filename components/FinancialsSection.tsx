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
import { MaterialIcon, formInputClass, formLabelUpperClass, formCheckboxClass } from './ApplicationFormUI';
import { SCHOLARSHIP_STATUS_COLORS } from '../constants';

interface FinancialsSectionProps {
    appData: Application;
    handleFinancialOfferChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleFinancialNumericChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFinancialCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDecisionDeadlineChange?: (date: string) => void;
    isAccepted?: boolean;
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
    handleDecisionDeadlineChange,
    isAccepted,
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
            <div className="flex items-center space-x-2 text-[#f4f4f5] border-b border-[#27272a] pb-2">
                <MaterialIcon name="attach_money" className="text-2xl text-[#a1a1aa]" />
                <h4 className="text-lg font-semibold">Funding & Financials</h4>
            </div>

            {/* Financial Offer Section */}
            <div className="bg-[#09090b] p-4 rounded-2xl space-y-4">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="offerReceived"
                        name="received"
                        checked={offer.received}
                        onChange={handleFinancialCheckboxChange}
                        className={`${formCheckboxClass} h-5 w-5`}
                    />
                    <label htmlFor="offerReceived" className="text-sm font-medium text-[#a1a1aa]">
                        Financial Offer Received
                    </label>
                </div>

                {offer.received && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-1">
                            <label className={formLabelUpperClass}>Stipend Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-[#a1a1aa]">$</span>
                                <input
                                    type="number"
                                    name="stipendAmount"
                                    value={offer.stipendAmount}
                                    onChange={handleFinancialNumericChange}
                                    className={`${formInputClass} pl-8`}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className={formLabelUpperClass}>Frequency</label>
                            <select
                                name="stipendFrequency"
                                value={offer.stipendFrequency}
                                onChange={handleFinancialOfferChange}
                                className={formInputClass}
                            >
                                {Object.values(StipendFrequency).map(freq => (
                                    <option key={freq} value={freq}>{freq}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className={formLabelUpperClass}>Tuition Waiver (%)</label>
                            <input
                                type="number"
                                name="tuitionWaiver"
                                value={offer.tuitionWaiver}
                                onChange={handleFinancialNumericChange}
                                min="0"
                                max="100"
                                className={formInputClass}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className={formLabelUpperClass}>Health Insurance</label>
                            <select
                                name="healthInsurance"
                                value={offer.healthInsurance}
                                onChange={handleFinancialOfferChange}
                                className={formInputClass}
                            >
                                {Object.values(HealthInsuranceCoverage).map(cov => (
                                    <option key={cov} value={cov}>{cov}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className={formLabelUpperClass}>Assistantship Type</label>
                            <select
                                name="assistantship"
                                value={offer.assistantship}
                                onChange={handleFinancialOfferChange}
                                className={formInputClass}
                            >
                                {Object.values(AssistantshipType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {offer.assistantship !== AssistantshipType.None && (
                            <div className="space-y-1">
                                <label className={formLabelUpperClass}>Hours / Week</label>
                                <input
                                    type="number"
                                    name="assistantshipHours"
                                    value={offer.assistantshipHours}
                                    onChange={handleFinancialNumericChange}
                                    className={formInputClass}
                                />
                            </div>
                        )}

                        <div className="col-span-1 md:col-span-2 space-y-1">
                            <label className={formLabelUpperClass}>Offer Notes</label>
                            <textarea
                                name="notes"
                                value={offer.notes}
                                onChange={handleFinancialOfferChange}
                                rows={2}
                                className={`${formInputClass} resize-none`}
                                placeholder="Any additional details about the offer..."
                            />
                        </div>

                        {/* Decision Deadline - shown for Accepted applications */}
                        {isAccepted && handleDecisionDeadlineChange && (
                            <div className="col-span-1 md:col-span-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-amber-300">
                                    <MaterialIcon name="event" className="text-lg" />
                                    <span className="text-sm font-medium">Decision Deadline</span>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                    <input
                                        type="date"
                                        value={appData.decisionDeadline || ''}
                                        onChange={(e) => handleDecisionDeadlineChange(e.target.value)}
                                        className={`${formInputClass} border-amber-500/40 focus:ring-amber-500 [color-scheme:dark]`}
                                    />
                                    <span className="text-xs text-amber-400">
                                        Set when you need to respond to this offer
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Scholarships Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-[#a1a1aa]">Scholarships & Grants</h5>
                    <button
                        type="button"
                        onClick={addScholarship}
                        className="text-sm text-[#a1a1aa] hover:text-[#fca5a5] font-medium flex items-center space-x-1"
                    >
                        <MaterialIcon name="add" className="text-lg" />
                        <span>Add Scholarship</span>
                    </button>
                </div>

                <div className="space-y-3">
                    {appData.scholarships?.map((scholarship, index) => (
                        <div key={index} className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
                            <div
                                className="flex items-center justify-between p-3 bg-[#27272a]/50 cursor-pointer"
                                onClick={() => setIsScholarshipOpen(prev => {
                                    const newState = [...prev];
                                    newState[index] = !newState[index];
                                    return newState;
                                })}
                            >
                                <div className="flex items-center space-x-3">
                                    <MaterialIcon name="school" className="text-[#a1a1aa]" />
                                    <span className="font-medium text-[#a1a1aa]">
                                        {scholarship.name || 'New Scholarship'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${SCHOLARSHIP_STATUS_COLORS[scholarship.status]}`}>
                                        {scholarship.status}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <MaterialIcon name={isScholarshipOpen[index] ? 'expand_less' : 'expand_more'} className="text-[#a1a1aa]" />
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeScholarship(index);
                                        }}
                                        className="p-1 text-[#a1a1aa] hover:text-red-500 transition-colors"
                                        aria-label={`Remove scholarship ${scholarship.name || index + 1}`}
                                    >
                                        <MaterialIcon name="delete" />
                                    </button>
                                </div>
                            </div>

                            {isScholarshipOpen[index] && (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Name</label>
                                        <input
                                            type="text"
                                            value={scholarship.name}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="name"
                                            className={formInputClass}
                                            placeholder="Scholarship Name"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-[#a1a1aa]">$</span>
                                            <input
                                                type="number"
                                                value={scholarship.amount}
                                                onChange={(e) => handleScholarshipChange(index, e)}
                                                name="amount"
                                                className={`${formInputClass} pl-8`}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Status</label>
                                        <select
                                            value={scholarship.status}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="status"
                                            className={formInputClass}
                                        >
                                            {Object.values(ScholarshipStatus).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Duration</label>
                                        <input
                                            type="text"
                                            value={scholarship.duration}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="duration"
                                            className={formInputClass}
                                            placeholder="e.g. 1 Year, Renewable"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Link</label>
                                        <input
                                            type="text"
                                            value={scholarship.link}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="link"
                                            className={formInputClass}
                                            placeholder="https://..."
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className={formLabelUpperClass}>Deadline</label>
                                        <input
                                            type="date"
                                            value={scholarship.deadline || ''}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="deadline"
                                            className={`${formInputClass} [color-scheme:dark]`}
                                        />
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-1">
                                        <label className={formLabelUpperClass}>Notes</label>
                                        <textarea
                                            value={scholarship.notes}
                                            onChange={(e) => handleScholarshipChange(index, e)}
                                            name="notes"
                                            rows={2}
                                            className={`${formInputClass} resize-none`}
                                            placeholder="Requirements, essays, etc."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {(!appData.scholarships || appData.scholarships.length === 0) && (
                        <div className="text-center py-6 text-[#a1a1aa] bg-[#09090b] rounded-xl border border-dashed border-[#27272a]">
                            No scholarships added yet.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FinancialsSection;
