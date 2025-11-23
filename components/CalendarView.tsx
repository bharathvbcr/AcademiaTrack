import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isToday
} from 'date-fns';
import { Application, FacultyContactStatus } from '../types';

interface CalendarViewProps {
    applications: Application[];
    onEdit: (app: Application) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ applications, onEdit }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getEventsForDay = (day: Date) => {
        const events: { type: 'deadline' | 'interview'; app: Application; label: string }[] = [];

        applications.forEach(app => {
            // Check Deadlines
            if (app.deadline) {
                const deadlineDate = new Date(app.deadline + 'T00:00:00');
                if (isSameDay(deadlineDate, day)) {
                    events.push({
                        type: 'deadline',
                        app,
                        label: `Deadline: ${app.universityName}`
                    });
                }
            }

            // Check Interviews
            app.facultyContacts.forEach(contact => {
                if (contact.interviewDate) {
                    const interviewDate = new Date(contact.interviewDate + 'T00:00:00');
                    if (isSameDay(interviewDate, day)) {
                        events.push({
                            type: 'interview',
                            app,
                            label: `Interview: ${contact.name} (${app.universityName})`
                        });
                    }
                }
            });
        });

        return events;
    };

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6 h-[calc(100vh-200px)] flex flex-col">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button
                        onClick={goToToday}
                        className="px-4 py-1.5 text-sm font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    >
                        <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 grid-rows-5 gap-2 flex-1 min-h-0">
                {calendarDays.map((day, dayIdx) => {
                    const events = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toString()}
                            className={`
                relative flex flex-col p-2 rounded-xl border transition-all overflow-hidden
                ${isCurrentMonth ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600'}
                ${isTodayDate ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
              `}
                        >
                            <span className={`text-sm font-semibold mb-1 ${isTodayDate ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
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
