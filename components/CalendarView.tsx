import React, { useState, useMemo } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { Application } from '../types';

interface CalendarViewProps {
    applications: Application[];
    onEdit: (app: Application) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ applications, onEdit }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const { monthStart, calendarDays } = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        return { monthStart, calendarDays: eachDayOfInterval({ start: startDate, end: endDate }) };
    }, [currentMonth]);

    const eventsByDay = useMemo(() => {
        const map = new Map<string, { type: 'deadline' | 'interview'; app: Application; label: string }[]>();
        applications.forEach(app => {
            if (app.deadline) {
                const key = app.deadline;
                if (!map.has(key)) map.set(key, []);
                map.get(key)!.push({ type: 'deadline', app, label: `Deadline: ${app.universityName}` });
            }
            app.facultyContacts.forEach(c => {
                if (c.interviewDate) {
                    if (!map.has(c.interviewDate)) map.set(c.interviewDate, []);
                    map.get(c.interviewDate)!.push({ type: 'interview', app, label: `Interview: ${c.name} (${app.universityName})` });
                }
            });
        });
        return map;
    }, [applications]);

    return (
        <div className="liquid-glass rounded-3xl p-6 h-[calc(100vh-200px)] flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#F5D7DA]">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        aria-label="Previous month"
                        className="p-2 rounded-full hover:bg-[rgba(192,48,80,0.25)] text-[#E8B4B8] hover:text-[#F5D7DA] transition-colors"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-4 py-1.5 text-sm font-medium rounded-full liquid-glass text-[#F5D7DA] hover:bg-[rgba(192,48,80,0.25)] transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        aria-label="Next month"
                        className="p-2 rounded-full hover:bg-[rgba(192,48,80,0.25)] text-[#E8B4B8] hover:text-[#F5D7DA] transition-colors"
                    >
                        <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div role="row" className="grid grid-cols-7 mb-2">
                {[['Sun','Sunday'],['Mon','Monday'],['Tue','Tuesday'],['Wed','Wednesday'],['Thu','Thursday'],['Fri','Friday'],['Sat','Saturday']].map(([abbr, full]) => (
                    <div key={abbr} role="columnheader" aria-label={full} className="text-center text-sm font-semibold text-[#E8B4B8]/70 py-2">
                        {abbr}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div role="grid" aria-label="Calendar" className="grid grid-cols-7 grid-rows-5 gap-2 flex-1 min-h-0">
                {calendarDays.map((day, dayIdx) => {
                    const events = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            role="gridcell"
                            aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                            className={`
                relative flex flex-col p-2 rounded-xl border transition-all overflow-hidden
                ${isCurrentMonth ? 'liquid-glass border-[#E8B4B8]/30' : 'liquid-glass border-[#E8B4B8]/20 text-[#E8B4B8]/50'}
                ${isTodayDate ? 'ring-2 ring-[#C03050] ring-offset-2' : ''}
              `}
                        >
                            <span className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-[#C03050]' : 'text-[#F5D7DA]'}`}>
                                {format(day, 'd')}
                            </span>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                                {events.map((event, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => onEdit(event.app)}
                                        className={`
                      w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-colors
                      ${event.type === 'deadline'
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'}
                    `}
                                        title={event.label}
                                    >
                                        {event.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
