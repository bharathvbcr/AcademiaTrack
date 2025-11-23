import React from 'react';
import { Application } from '../types';
import { FieldSet, MaterialIcon } from './ApplicationFormUI';

interface RemindersSectionProps {
    appData: Omit<Application, 'id'>;
    toggleReminder: (id: string) => void;
    updateReminderDate: (id: string, date: string) => void;
    deleteReminder: (id: string) => void;
    addReminder: () => void;
}

const RemindersSection: React.FC<RemindersSectionProps> = ({
    appData,
    toggleReminder,
    updateReminderDate,
    deleteReminder,
    addReminder,
}) => {
    return (
        <FieldSet legend="Reminders">
            <div className="md:col-span-2 space-y-3">
                {(appData.reminders || []).map(reminder => (
                    <div key={reminder.id} className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={reminder.completed}
                            onChange={() => toggleReminder(reminder.id)}
                            className="h-5 w-5 rounded border-slate-400 text-red-600 focus:ring-red-500"
                        />
                        <div className="flex-grow">
                            <div className={`text-sm font-medium ${reminder.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>{reminder.text}</div>
                        </div>
                        <input
                            type="date"
                            value={reminder.date}
                            onChange={(e) => updateReminderDate(reminder.id, e.target.value)}
                            className="text-sm bg-transparent border-none focus:ring-0 text-slate-500 dark:text-slate-400"
                        />
                        <button type="button" onClick={() => deleteReminder(reminder.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <MaterialIcon name="delete" className="text-lg" />
                        </button>
                    </div>
                ))}
                <button type="button" onClick={addReminder} className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors">
                    <MaterialIcon name="add_alert" className="text-lg" />
                    Add Reminder
                </button>
            </div>
        </FieldSet>
    );
};

export default RemindersSection;
