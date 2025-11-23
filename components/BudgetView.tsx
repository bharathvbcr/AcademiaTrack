import React, { useMemo } from 'react';
import { Application } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

interface BudgetViewProps {
    applications: Application[];
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const BudgetView: React.FC<BudgetViewProps> = ({ applications }) => {
    const { totalAppFees, totalTestCosts, totalCost, costByUniversity } = useMemo(() => {
        let totalAppFees = 0;
        let totalTestCosts = 0;
        const costByUniversity: { name: string; value: number }[] = [];

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
        });

        return {
            totalAppFees,
            totalTestCosts,
            totalCost: totalAppFees + totalTestCosts,
            costByUniversity: costByUniversity.sort((a, b) => b.value - a.value)
        };
    }, [applications]);

    const expenseBreakdown = [
        { name: 'Application Fees', value: totalAppFees },
        { name: 'Test Costs', value: totalTestCosts },
    ].filter(item => item.value > 0);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Application Fees</h3>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">${totalAppFees}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Cost by University</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={costByUniversity} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis dataKey="name" type="category" width={100} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                                    contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    itemStyle={{ color: '#1e293b' }}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetView;
