import React, { useMemo, useState } from 'react';
import { Application, ApplicationStatus } from '../types';
import { STATUS_COLORS } from '../constants';

interface TimelineViewProps {
    applications: Application[];
    onEdit: (app: Application) => void;
}

const MONTH_WIDTH = 120;
const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 40;
const SIDEBAR_WIDTH = 200;

const TimelineView: React.FC<TimelineViewProps> = ({ applications, onEdit }) => {
    const [scrollX, setScrollX] = useState(0);

    // 1. Determine Date Range
    const { minDate, maxDate, totalMonths, months } = useMemo(() => {
        // Helper to generate months
        const generateMonths = (start: Date, end: Date) => {
            const m = [];
            const diff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
            for (let i = 0; i < diff; i++) {
                const d = new Date(start);
                d.setMonth(d.getMonth() + i);
                m.push(d);
            }
            return { total: diff, list: m };
        };

        if (applications.length === 0) {
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 6, 0); // ~6 months window
            const { total, list } = generateMonths(start, end);
            return { minDate: start, maxDate: end, totalMonths: total, months: list };
        }

        // Find min/max dates from deadlines
        const dates = applications
            .map(app => app.deadline ? new Date(app.deadline) : null)
            .filter((d): d is Date => d !== null && !isNaN(d.getTime()));

        if (dates.length === 0) {
            // Default view if apps exist but no deadlines
            const now = new Date();
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);
            const { total, list } = generateMonths(start, end);
            return { minDate: start, maxDate: end, totalMonths: total, months: list };
        }

        // Default start: 3 months before earliest deadline
        const minDeadline = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDeadline = new Date(Math.max(...dates.map(d => d.getTime())));

        const timelineStart = new Date(minDeadline);
        timelineStart.setMonth(timelineStart.getMonth() - 4);
        timelineStart.setDate(1); // Start of month

        const timelineEnd = new Date(maxDeadline);
        timelineEnd.setMonth(timelineEnd.getMonth() + 2); // Buffer
        timelineEnd.setDate(0); // End of month

        // Ensure we don't have an inverted range if one deadline exists
        if (timelineEnd < timelineStart) {
            timelineEnd.setMonth(timelineStart.getMonth() + 6);
        }

        const { total, list } = generateMonths(timelineStart, timelineEnd);

        return { minDate: timelineStart, maxDate: timelineEnd, totalMonths: total, months: list };
    }, [applications]);

    const getXPosition = (date: Date) => {
        if (!date) return 0;
        const diffTime = date.getTime() - minDate.getTime();
        const days = diffTime / (1000 * 60 * 60 * 24);
        // Approximate pixels per day
        const pixelsPerDay = MONTH_WIDTH / 30;
        return days * pixelsPerDay;
    };

    const sortedApplications = useMemo(() => {
        return [...applications].sort((a, b) => {
            // Put no-deadline apps at the bottom
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            const dateA = new Date(a.deadline).getTime();
            const dateB = new Date(b.deadline).getTime();
            return dateA - dateB;
        });
    }, [applications]);

    if (applications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <span className="material-symbols-outlined text-4xl mb-2">timeline</span>
                <p>No applications to display on timeline.</p>
            </div>
        );
    }

    const todayX = getXPosition(new Date());

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col h-[calc(100vh-200px)]">

            {/* Scrollable Container */}
            <div className="overflow-auto flex-1 relative custom-scrollbar">
                <div style={{ width: Math.max(SIDEBAR_WIDTH + (totalMonths * MONTH_WIDTH), 800), minWidth: '100%' }}>

                    {/* Header */}
                    <div className="flex sticky top-0 z-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                        <div className="sticky left-0 bg-white dark:bg-slate-800 z-30 border-r border-slate-200 dark:border-slate-700 p-2 font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0" style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT }}>
                            Application
                        </div>
                        <div className="relative h-10 flex grow">
                            {months.map((month, index) => (
                                <div
                                    key={index}
                                    className="absolute border-r border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 uppercase font-medium flex items-center justify-center"
                                    style={{
                                        left: index * MONTH_WIDTH,
                                        width: MONTH_WIDTH,
                                        height: HEADER_HEIGHT
                                    }}
                                >
                                    {month.toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rows */}
                    <div className="relative">
                        {/* Background Grid Lines */}
                        {months.map((_, index) => (
                            <div
                                key={`grid-${index}`}
                                className="absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-700/30 w-px"
                                style={{ left: (index + 1) * MONTH_WIDTH }} // +1 to draw at end of month
                            />
                        ))}

                        {/* Today Line */}
                        {todayX >= 0 && (
                            <div
                                className="absolute top-0 bottom-0 border-l-2 border-red-500 z-10 opacity-50 pointer-events-none"
                                style={{ left: todayX }}
                            >
                                <div className="text-[10px] bg-red-500 text-white px-1 rounded-sm absolute -top-0 -translate-x-1/2">Today</div>
                            </div>
                        )}

                        {sortedApplications.map((app, index) => {
                            let barContent = null;

                            if (app.deadline) {
                                const startX = getXPosition(new Date(new Date(app.deadline).getTime() - 90 * 24 * 60 * 60 * 1000));
                                const endX = getXPosition(new Date(app.deadline));
                                const width = Math.max(endX - startX, 10);

                                barContent = (
                                    <div
                                        className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full opacity-80 hover:opacity-100 transition-all cursor-pointer shadow-sm border border-black/5 ${app.status === ApplicationStatus.Submitted ? 'bg-green-500' :
                                            app.status === ApplicationStatus.Accepted ? 'bg-emerald-600' :
                                                app.status === ApplicationStatus.Rejected ? 'bg-red-500' :
                                                    app.status === ApplicationStatus.Waitlisted ? 'bg-amber-500' :
                                                        'bg-blue-500'
                                            }`}
                                        style={{ left: startX, width }}
                                        onClick={() => onEdit(app)}
                                        title={`Deadline: ${new Date(app.deadline).toLocaleDateString()}`}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 translate-x-full whitespace-nowrap">
                                            {new Date(app.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                );
                            } else {
                                barContent = (
                                    <div className="px-4 flex items-center h-full text-xs text-slate-400 italic">
                                        No deadline set
                                    </div>
                                );
                            }

                            return (
                                <div key={app.id} className="flex relative hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group border-b border-slate-50 dark:border-slate-700/10">
                                    {/* Fixed Sidebar Row */}
                                    <div
                                        className="sticky left-0 bg-white/95 dark:bg-slate-800/95 z-10 border-r border-slate-200 dark:border-slate-700 p-3 flex items-center shrink-0"
                                        style={{ width: SIDEBAR_WIDTH, height: ROW_HEIGHT }}
                                    >
                                        <div className="truncate w-full cursor-pointer" onClick={() => onEdit(app)}>
                                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={app.universityName}>{app.universityName}</div>
                                            <div className="text-xs text-slate-500 truncate" title={app.programName}>{app.programName}</div>
                                        </div>
                                    </div>

                                    {/* Timeline Bar Area */}
                                    <div className="relative grow h-full" style={{ height: ROW_HEIGHT }}>
                                        {barContent}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimelineView;
