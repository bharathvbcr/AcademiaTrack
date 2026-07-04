import React from 'react';
import { Application } from '../types';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { formatCurrency } from '../utils/formatters';
import { formatLocalDate } from '../utils/dateUtils';
import { STATUS_COLORS } from '../constants';
import { MaterialIcon } from './ApplicationFormUI';

interface ComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    applications: Application[];
}

const stickyLabelClass =
    'px-5 py-3.5 text-sm font-medium text-[#f4f4f5] sticky left-0 bg-[#18181b] border-r border-[#27272a] z-10';
const cellClass = 'px-5 py-3.5 text-sm text-[#a1a1aa]';
const sectionRowClass = 'bg-[#09090b]/60';

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, applications }) => {
    useLockBodyScroll(isOpen);
    useEscapeKey(isOpen, onClose);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div
                    className="fixed inset-0 liquid-glass-modal transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                />

                <div className="inline-block align-bottom liquid-glass-modal-content rounded-2xl text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle sm:w-full sm:max-w-6xl">
                    <div className="h-0.5 bg-gradient-to-r from-[#dc2626]/60 via-[#dc2626]/40 to-transparent" />
                    <div className="px-5 pt-5 pb-4 sm:px-6 border-b border-[#27272a] flex justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-[#f4f4f5]" id="modal-title">
                                Compare Applications
                            </h3>
                            <p className="text-sm text-[#a1a1aa] mt-0.5">
                                {applications.length} application{applications.length === 1 ? '' : 's'} side by side
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label="Close comparison modal"
                            className="rounded-lg text-[#a1a1aa] hover:text-[#f4f4f5] focus:outline-none hover:bg-[#27272a] p-2 transition-colors focus:ring-2 focus:ring-[#dc2626] focus:ring-offset-2 focus:ring-offset-[#09090b]"
                        >
                            <MaterialIcon name="close" />
                        </button>
                    </div>

                    {applications.length < 2 ? (
                        <div className="px-6 py-16 text-center">
                            <span className="material-symbols-outlined text-4xl text-[#a1a1aa] mb-3 block">compare</span>
                            <p className="text-[#f4f4f5] font-medium">Select at least 2 applications to compare</p>
                            <p className="text-sm text-[#a1a1aa] mt-1">Enter selection mode and pick the schools you want to evaluate.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="min-w-full divide-y divide-[#27272a]">
                                <thead className="bg-[#09090b]">
                                    <tr>
                                        <th scope="col" className="px-5 py-4 text-left text-xs font-medium text-[#a1a1aa] uppercase tracking-wider w-40 sticky left-0 bg-[#09090b] z-10 border-r border-[#27272a]">
                                            Feature
                                        </th>
                                        {applications.map(app => (
                                            <th key={app.id} scope="col" className="px-5 py-4 text-left text-xs font-semibold text-[#f4f4f5] uppercase tracking-wider min-w-[200px]">
                                                <div className="line-clamp-2">{app.universityName}</div>
                                                <div className="text-[10px] font-normal text-[#a1a1aa] normal-case mt-0.5">{app.programName}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-[#18181b] divide-y divide-[#27272a]">
                                    <tr>
                                        <td className={stickyLabelClass}>Program</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                {app.programName} ({app.programType})
                                            </td>
                                        ))}
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>Status</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>Deadline</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                {formatLocalDate(app.deadline)}
                                            </td>
                                        ))}
                                    </tr>

                                    <tr className={sectionRowClass}>
                                        <td colSpan={applications.length + 1} className="px-5 py-2 text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
                                            Financials
                                        </td>
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>App Fee</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                {formatCurrency(app.applicationFee)} ({app.feeWaiverStatus})
                                            </td>
                                        ))}
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>Stipend</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                {app.financialOffer ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-emerald-400">
                                                            {formatCurrency(app.financialOffer.stipendAmount)}
                                                        </span>
                                                        <span className="text-xs text-[#71717a]">
                                                            /{app.financialOffer.stipendFrequency}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[#71717a]">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>Tuition Waiver</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={cellClass}>
                                                {app.financialOffer ? (
                                                    <span>{app.financialOffer.tuitionWaiver}%</span>
                                                ) : (
                                                    <span className="text-[#71717a]">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>

                                    <tr>
                                        <td className={stickyLabelClass}>Notes</td>
                                        {applications.map(app => (
                                            <td key={app.id} className={`${cellClass} max-w-xs`} title={app.notes}>
                                                <span className="line-clamp-3">{app.notes || '—'}</span>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-5 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-[#27272a]">
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-xl border border-[#27272a] px-4 py-2 text-sm font-medium text-[#f4f4f5] bg-[#18181b] hover:bg-[#27272a] focus:outline-none transition-colors sm:mt-0 sm:w-auto"
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
