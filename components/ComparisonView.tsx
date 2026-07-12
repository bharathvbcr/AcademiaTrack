import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application, ApplicationStatus, StipendFrequency } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ComparisonViewProps {
    applications: Application[];
}

const COLORS = {
    stipend: '#10b981',
    fee: '#ef4444',
    tuition: '#3b82f6',
    total: '#f59e0b',
};

// Helper to normalize stipend to annual amount
const normalizeStipend = (amount: number, frequency: StipendFrequency): number => {
    switch (frequency) {
        case StipendFrequency.Monthly:
            return amount * 12;
        case StipendFrequency.Yearly:
        default:
            return amount;
    }
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ applications }) => {
    const [showView, setShowView] = useState(true);

    // Filter only accepted applications with financial offers
    const acceptedApplications = useMemo(() => {
        return applications.filter(
            app => app.status === ApplicationStatus.Accepted && app.financialOffer?.received
        );
    }, [applications]);

    // Prepare comparison data
    const comparisonData = useMemo(() => {
        return acceptedApplications.map(app => {
            const offer = app.financialOffer!;
            const annualStipend = normalizeStipend(offer.stipendAmount, offer.stipendFrequency);
            const estimatedTuition = 50000; // Base assumption for US grad programs
            const tuitionCost = estimatedTuition * (1 - offer.tuitionWaiver / 100);
            const totalPackageValue = annualStipend + (estimatedTuition - tuitionCost);

            return {
                name: app.universityName.length > 20
                    ? app.universityName.substring(0, 20) + '...'
                    : app.universityName,
                fullName: app.universityName,
                stipend: annualStipend,
                tuitionWaiver: offer.tuitionWaiver,
                applicationFee: app.applicationFee,
                packageValue: totalPackageValue,
                hasInsurance: offer.healthInsurance !== 'None',
                hasAssistantship: offer.assistantship !== 'None',
            };
        });
    }, [acceptedApplications]);

    if (acceptedApplications.length === 0) {
        return (
            <div className="liquid-glass-card p-6 rounded-3xl mb-0">
                <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-4 block">compare_arrows</span>
                    <h3 className="text-lg font-semibold text-[#a1a1aa] mb-2">No Offers to Compare</h3>
                    <p className="text-[#a1a1aa]">
                        Mark applications as "Accepted" and add financial offer details to see a comparison.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="liquid-glass-card p-6 rounded-3xl mb-0">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#f4f4f5] flex items-center gap-2">
                    <span className="material-symbols-outlined">compare_arrows</span>
                    Accepted Offers Comparison
                </h2>
                <button
                    onClick={() => setShowView(!showView)}
                    aria-expanded={showView}
                    aria-controls="comparison-view-content"
                    className="flex items-center gap-2 text-sm font-medium text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors"
                >
                    <span className="material-symbols-outlined text-lg" aria-hidden="true">
                        {showView ? 'expand_less' : 'expand_more'}
                    </span>
                    {showView ? 'Hide' : 'Show'}
                </button>
            </div>

            <AnimatePresence>
                {showView && (
                    <motion.div
                        id="comparison-view-content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6 overflow-hidden"
                    >
                        {/* Stipend Comparison Bar Chart */}
                        <div>
                            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Annual Stipend Comparison</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                        <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                                        <Tooltip
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Annual Stipend']}
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                borderRadius: '0.75rem',
                                                border: '1px solid #27272a',
                                                color: '#f4f4f5',
                                            }}
                                            labelStyle={{ color: '#a1a1aa' }}
                                        />
                                        <Bar dataKey="stipend" fill={COLORS.stipend} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Package Value Comparison */}
                        <div>
                            <h3 className="text-sm font-medium text-[#a1a1aa] mb-3">Total Package Value (Stipend + Tuition Savings)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                        <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} stroke="#a1a1aa" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#a1a1aa' }} />
                                        <Tooltip
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Package Value']}
                                            contentStyle={{
                                                backgroundColor: '#18181b',
                                                borderRadius: '0.75rem',
                                                border: '1px solid #27272a',
                                                color: '#f4f4f5',
                                            }}
                                            labelStyle={{ color: '#a1a1aa' }}
                                        />
                                        <Bar dataKey="packageValue" fill={COLORS.total} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {comparisonData.map((app) => (
                                <div
                                    key={app.fullName}
                                    className="p-4 rounded-xl bg-[#09090b] border border-[#27272a]"
                                >
                                    <h4 className="font-semibold text-[#f4f4f5] mb-2 truncate" title={app.fullName}>
                                        {app.name}
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-[#a1a1aa]">Annual Stipend</span>
                                            <span className="font-medium text-green-400">${app.stipend.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#a1a1aa]">Tuition Waiver</span>
                                            <span className="font-medium text-blue-400">{app.tuitionWaiver}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#a1a1aa]">Health Insurance</span>
                                            <span className={`font-medium ${app.hasInsurance ? 'text-green-400' : 'text-[#71717a]'}`}>
                                                <span aria-hidden="true">{app.hasInsurance ? '✓ ' : '✗ '}</span>
                                                {app.hasInsurance ? 'Included' : 'Not included'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[#a1a1aa]">Assistantship</span>
                                            <span className={`font-medium ${app.hasAssistantship ? 'text-green-400' : 'text-[#71717a]'}`}>
                                                <span aria-hidden="true">{app.hasAssistantship ? '✓ ' : '✗ '}</span>
                                                {app.hasAssistantship ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComparisonView;
