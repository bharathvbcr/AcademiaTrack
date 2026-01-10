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
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-6">
                <div className="text-center py-8">
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-4 block">compare_arrows</span>
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">No Offers to Compare</h3>
                    <p className="text-slate-500 dark:text-slate-400">
                        Mark applications as "Accepted" and add financial offer details to see a comparison.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span className="material-symbols-outlined">compare_arrows</span>
                    Accepted Offers Comparison
                </h2>
                <button
                    onClick={() => setShowView(!showView)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">
                        {showView ? 'expand_less' : 'expand_more'}
                    </span>
                    {showView ? 'Hide' : 'Show'}
                </button>
            </div>

            <AnimatePresence>
                {showView && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6 overflow-hidden"
                    >
                        {/* Stipend Comparison Bar Chart */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Annual Stipend Comparison</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Annual Stipend']}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '0.75rem',
                                                border: '1px solid #e2e8f0',
                                            }}
                                        />
                                        <Bar dataKey="stipend" fill={COLORS.stipend} radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Package Value Comparison */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-3">Total Package Value (Stipend + Tuition Savings)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                                        <Tooltip
                                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Package Value']}
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                borderRadius: '0.75rem',
                                                border: '1px solid #e2e8f0',
                                            }}
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
                                    className="p-4 rounded-xl bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600"
                                >
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 truncate" title={app.fullName}>
                                        {app.name}
                                    </h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Annual Stipend</span>
                                            <span className="font-medium text-green-600 dark:text-green-400">${app.stipend.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Tuition Waiver</span>
                                            <span className="font-medium text-blue-600 dark:text-blue-400">{app.tuitionWaiver}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Health Insurance</span>
                                            <span className={`font-medium ${app.hasInsurance ? 'text-green-600' : 'text-slate-400'}`}>
                                                {app.hasInsurance ? '✓ Included' : '✗ Not included'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 dark:text-slate-400">Assistantship</span>
                                            <span className={`font-medium ${app.hasAssistantship ? 'text-green-600' : 'text-slate-400'}`}>
                                                {app.hasAssistantship ? '✓ Yes' : '✗ No'}
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
