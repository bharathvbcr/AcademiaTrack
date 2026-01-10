import React, { useMemo } from 'react';
import { Application, StipendFrequency } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { MaterialIcon } from './ApplicationFormUI';

interface BudgetViewProps {
    applications: Application[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const BudgetView: React.FC<BudgetViewProps> = ({ applications }) => {
    const {
        totalAppFees,
        totalTestCosts,
        totalCost,
        totalStipendPotential,
        costByUniversity,
        financialOffers,
        scholarships,
        costPerChance
    } = useMemo(() => {
        let totalAppFees = 0;
        let totalTestCosts = 0;
        let totalStipendPotential = 0;
        const costByUniversity: { name: string; value: number }[] = [];
        const financialOffers: { university: string; stipend: number; waiver: number; net: number }[] = [];
        const scholarships: { name: string; amount: number; status: string; university: string }[] = [];
        const costPerChance: { name: string; fee: number; chance: number; costPerPercent: number }[] = [];

        applications.forEach(app => {
            const appFee = app.applicationFee || 0;
            const greCost = app.gre?.cost || 0;
            const englishCost = app.englishTest?.cost || 0;
            const appTotal = appFee + greCost + englishCost;

            totalAppFees += appFee;
            totalTestCosts += (greCost + englishCost);

            if (appTotal > 0) {
                costByUniversity.push({ name: app.universityName, value: appTotal });
            }

            // Cost per admission chance analysis
            if (app.admissionChance && app.admissionChance > 0) {
                costPerChance.push({
                    name: app.universityName.length > 15 ? app.universityName.substring(0, 15) + '...' : app.universityName,
                    fee: appFee,
                    chance: app.admissionChance,
                    costPerPercent: appFee / app.admissionChance
                });
            }

            // Financial Offers
            if (app.financialOffer && app.financialOffer.received) {
                let annualStipend = app.financialOffer.stipendAmount || 0;
                if (app.financialOffer.stipendFrequency === StipendFrequency.Monthly) {
                    annualStipend *= 12; // Estimate annual
                }
                totalStipendPotential += annualStipend;

                financialOffers.push({
                    university: app.universityName,
                    stipend: annualStipend,
                    waiver: app.financialOffer.tuitionWaiver || 0,
                    net: annualStipend // Simplified net value for now
                });
            }

            // Scholarships
            if (app.scholarships) {
                app.scholarships.forEach(sch => {
                    scholarships.push({
                        name: sch.name,
                        amount: sch.amount,
                        status: sch.status,
                        university: app.universityName
                    });
                });
            }
        });

        return {
            totalAppFees,
            totalTestCosts,
            totalCost: totalAppFees + totalTestCosts,
            totalStipendPotential,
            costByUniversity: costByUniversity.sort((a, b) => b.value - a.value),
            financialOffers: financialOffers.sort((a, b) => b.stipend - a.stipend),
            scholarships,
            costPerChance: costPerChance.sort((a, b) => a.costPerPercent - b.costPerPercent)
        };
    }, [applications]);

    const expenseBreakdown = [
        { name: 'Application Fees', value: totalAppFees },
        { name: 'Test Costs', value: totalTestCosts },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Expenses</h3>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">${totalCost}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Avg. Cost per App</h3>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                        ${applications.length > 0 ? Math.round(totalCost / applications.length) : 0}
                    </p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Potential Income</h3>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">${totalStipendPotential.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">Annualized Stipends</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Value</h3>
                    <p className={`text-3xl font-bold mt-2 ${totalStipendPotential - totalCost >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        ${(totalStipendPotential - totalCost).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Expense Breakdown</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {expenseBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Offer Comparison */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Offer Comparison</h3>
                    {financialOffers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 rounded-l-lg">University</th>
                                        <th scope="col" className="px-6 py-3">Stipend (yr)</th>
                                        <th scope="col" className="px-6 py-3 rounded-r-lg">Waiver</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {financialOffers.map((offer, index) => (
                                        <tr key={index} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                                {offer.university}
                                            </td>
                                            <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">
                                                ${offer.stipend.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {offer.waiver}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <MaterialIcon name="attach_money" className="text-4xl mb-2 opacity-50" />
                            <p>No financial offers recorded yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Scholarships List */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Scholarships & Grants</h3>
                {scholarships.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scholarships.map((sch, index) => (
                            <div key={index} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/30">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-slate-900 dark:text-white truncate pr-2" title={sch.name}>{sch.name}</h4>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${sch.status === 'Awarded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {sch.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{sch.university}</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">${sch.amount.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        No scholarships tracked.
                    </div>
                )}
            </div>

            {/* Cost per Admission Chance Analysis */}
            {costPerChance.length > 0 && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Cost per Admission Chance</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Lower cost per 1% admission chance = better ROI. Add admission chance estimates to your applications to see this analysis.
                    </p>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costPerChance} layout="vertical" margin={{ left: 20, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                    type="number"
                                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                                    label={{ value: 'Cost per 1% Chance', position: 'bottom', offset: 0 }}
                                />
                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: number, _name: string, props: any) => [
                                        `$${value.toFixed(2)} per 1%`,
                                        `Fee: $${props.payload.fee} | Chance: ${props.payload.chance}%`
                                    ]}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Bar dataKey="costPerPercent" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {costPerChance.slice(0, 3).map((app, index) => (
                            <div key={index} className={`p-3 rounded-lg ${index === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-slate-50 dark:bg-slate-700/30'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {index === 0 && <span className="text-green-600 dark:text-green-400 text-xs font-medium">Best ROI</span>}
                                </div>
                                <p className="font-medium text-slate-800 dark:text-white truncate" title={app.name}>{app.name}</p>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-slate-500 dark:text-slate-400">Fee: ${app.fee}</span>
                                    <span className="text-slate-500 dark:text-slate-400">Chance: {app.chance}%</span>
                                </div>
                                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">${app.costPerPercent.toFixed(2)}/1%</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetView;
