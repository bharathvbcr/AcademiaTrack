import React, { useMemo } from 'react';
import { Application, StipendFrequency } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import ComparisonView from './ComparisonView';

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
        scholarships,
        costPerChance
    } = useMemo(() => {
        let totalAppFees = 0;
        let totalTestCosts = 0;
        let totalStipendPotential = 0;
        const costByUniversity: { name: string; value: number }[] = [];
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

            // Financial Offers (stipend totals; detailed charts live in ComparisonView)
            if (app.financialOffer && app.financialOffer.received) {
                let annualStipend = app.financialOffer.stipendAmount || 0;
                if (app.financialOffer.stipendFrequency === StipendFrequency.Monthly) {
                    annualStipend *= 12; // Estimate annual
                }
                totalStipendPotential += annualStipend;
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
                <div className="liquid-glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-[#a1a1aa]/70 uppercase tracking-wider">Total Expenses</h3>
                    <p className="text-3xl font-bold text-[#f4f4f5] mt-2">${totalCost.toLocaleString()}</p>
                </div>
                <div className="liquid-glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-[#a1a1aa]/70 uppercase tracking-wider">Avg. Cost per App</h3>
                    <p className="text-3xl font-bold text-[#f4f4f5] mt-2">
                        ${applications.length > 0 ? Math.round(totalCost / applications.length).toLocaleString() : 0}
                    </p>
                </div>
                <div className="liquid-glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-[#a1a1aa]/70 uppercase tracking-wider">Potential Income</h3>
                    <p className="text-3xl font-bold text-[#10b981] mt-2">${totalStipendPotential.toLocaleString()}</p>
                    <p className="text-xs text-[#a1a1aa]/50 mt-1">Annualized Stipends</p>
                </div>
                <div className="liquid-glass-card p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-[#a1a1aa]/70 uppercase tracking-wider">Net Value</h3>
                    <p className={`text-3xl font-bold mt-2 ${totalStipendPotential - totalCost >= 0 ? 'text-[#10b981]' : 'text-[#dc2626]'}`}>
                        ${(totalStipendPotential - totalCost).toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown */}
                <div className="liquid-glass-card p-6 rounded-3xl">
                    <h3 className="text-lg font-semibold text-[#f4f4f5] mb-6">Expense Breakdown</h3>
                    <div className="h-80">
                        {expenseBreakdown.length > 0 ? (
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
                        ) : (
                            <div className="h-full flex items-center justify-center text-[#a1a1aa]/60 text-sm">
                                No expenses tracked yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Offer Comparison charts (wired from formerly unwired ComparisonView) */}
                <ComparisonView applications={applications} />
            </div>

            {/* Scholarships List */}
            <div className="liquid-glass-card p-6 rounded-3xl">
                <h3 className="text-lg font-semibold text-[#f4f4f5] mb-6">Scholarships & Grants</h3>
                {scholarships.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {scholarships.map((sch, index) => (
                            <div key={index} className="p-4 rounded-xl liquid-glass">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-medium text-[#f4f4f5] truncate pr-2" title={sch.name}>{sch.name}</h4>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${sch.status === 'Awarded' ? 'bg-[rgba(16,185,129,0.2)] text-[#10b981]' : 'bg-[#dc2626]/10 text-[#dc2626]'}`}>
                                        {sch.status}
                                    </span>
                                </div>
                                <p className="text-sm text-[#a1a1aa]/70 mb-1">{sch.university}</p>
                                <p className="text-lg font-bold text-[#f4f4f5]">${sch.amount.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-[#a1a1aa]/70">
                        No scholarships tracked.
                    </div>
                )}
            </div>

            {/* Cost per Admission Chance Analysis */}
            {costPerChance.length > 0 && (
                <div className="liquid-glass-card p-6 rounded-3xl">
                    <h3 className="text-lg font-semibold text-[#f4f4f5] mb-2">Cost per Admission Chance</h3>
                    <p className="text-sm text-[#a1a1aa]/70 mb-6">
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
                            <div key={index} className={`p-3 rounded-lg ${index === 0 ? 'bg-[rgba(16,185,129,0.2)] border border-[#10b981]/30' : 'liquid-glass'}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    {index === 0 && <span className="text-[#10b981] text-xs font-medium">Best ROI</span>}
                                </div>
                                <p className="font-medium text-[#f4f4f5] truncate" title={app.name}>{app.name}</p>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-[#a1a1aa]/70">Fee: ${app.fee}</span>
                                    <span className="text-[#a1a1aa]/70">Chance: {app.chance}%</span>
                                </div>
                                <p className="text-lg font-bold text-[#dc2626]">${app.costPerPercent.toFixed(2)}/1%</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetView;
