import React from 'react';
import { Application, ApplicationStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    applications: Application[];
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, applications }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 bg-slate-500/75 dark:bg-slate-900/75 transition-opacity backdrop-blur-sm"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white dark:bg-slate-800 rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-6xl">
                    <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white" id="modal-title">
                            Compare Applications
                        </h3>
                        <button
                            onClick={onClose}
                            className="bg-white dark:bg-slate-800 rounded-md text-slate-400 hover:text-slate-500 focus:outline-none"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider w-40 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 border-r border-slate-200 dark:border-slate-700 shadow-sm">
                                        Feature
                                    </th>
                                    {applications.map(app => (
                                        <th key={app.id} scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider min-w-[200px]">
                                            {app.universityName}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                                {/* Program Row */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Program
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {app.programName} ({app.programType})
                                        </td>
                                    ))}
                                </tr>

                                {/* Status Row */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Status
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${app.status === ApplicationStatus.Accepted ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                                                app.status === ApplicationStatus.Rejected ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
                                                    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                    ))}
                                </tr>

                                {/* Deadline Row */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Deadline
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {app.deadline ? new Date(app.deadline).toLocaleDateString() : '-'}
                                        </td>
                                    ))}
                                </tr>

                                {/* Financials Header */}
                                <tr className="bg-slate-50/50 dark:bg-slate-700/30">
                                    <td colSpan={applications.length + 1} className="px-6 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                                        Financials
                                    </td>
                                </tr>

                                {/* Application Fee */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        App Fee
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {formatCurrency(app.applicationFee)} ({app.feeWaiverStatus})
                                        </td>
                                    ))}
                                </tr>

                                {/* Stipend */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Stipend
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {app.financialOffer ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                                        {formatCurrency(app.financialOffer.stipendAmount)}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        /{app.financialOffer.stipendFrequency}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>

                                {/* Tuition Waiver */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Tuition Waiver
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {app.financialOffer ? (
                                                <span>{app.financialOffer.tuitionWaiver}%</span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                    ))}
                                </tr>

                                {/* Notes */}
                                <tr>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                                        Notes
                                    </td>
                                    {applications.map(app => (
                                        <td key={app.id} className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={app.notes}>
                                            {app.notes || '-'}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/30 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonModal;
