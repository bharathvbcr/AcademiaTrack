import React, { useState } from 'react';
import { Application } from '../types';
import { FieldSet, MaterialIcon, formCheckboxClass, formInputSmClass } from './ApplicationFormUI';

interface RemindersSectionProps {
    appData: Omit<Application, 'id'>;
    toggleReminder: (id: string) => void;
    updateReminderDate: (id: string, date: string) => void;
    deleteReminder: (id: string) => void;
    addReminder: (text: string) => void;
}

const RemindersSection: React.FC<RemindersSectionProps> = ({
    appData,
    toggleReminder,
    updateReminderDate,
    deleteReminder,
    addReminder,
}) => {
    const [newReminderText, setNewReminderText] = useState('');

    const handleAdd = () => {
        addReminder(newReminderText);
        setNewReminderText('');
    };

    return (
        <FieldSet legend="Reminders">
            <div className="md:col-span-2 space-y-3">
                {(appData.reminders || []).map(reminder => (
                    <div key={reminder.id} className="flex items-center gap-3 p-3 bg-[#09090b] rounded-lg border border-[#27272a]">
                        <input
                            type="checkbox"
                            checked={reminder.completed}
                            onChange={() => toggleReminder(reminder.id)}
                            className={`${formCheckboxClass} h-5 w-5`}
                        />
                        <div className="flex-grow">
                            <div className={`text-sm font-medium ${reminder.completed ? 'text-[#a1a1aa] line-through' : 'text-[#f4f4f5]'}`}>{reminder.text}</div>
                        </div>
                        <input
                            type="date"
                            value={reminder.date}
                            onChange={(e) => updateReminderDate(reminder.id, e.target.value)}
                            className="text-sm bg-[#18181b] border border-[#27272a] rounded-md px-2 py-1 text-[#a1a1aa] [color-scheme:dark]"
                        />
                        <button type="button" onClick={() => deleteReminder(reminder.id)} className="text-[#a1a1aa] hover:text-red-500 transition-colors" aria-label="Delete reminder">
                            <MaterialIcon name="delete" className="text-lg" />
                        </button>
                    </div>
                ))}
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newReminderText}
                        onChange={(e) => setNewReminderText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                        placeholder="New reminder..."
                        className={`flex-grow ${formInputSmClass}`}
                    />
                    <button type="button" onClick={handleAdd} className="flex items-center gap-2 text-sm font-medium text-[#dc2626] hover:text-[#fca5a5] transition-colors shrink-0">
                        <MaterialIcon name="add_alert" className="text-lg" />
                        Add Reminder
                    </button>
                </div>
            </div>
        </FieldSet>
    );
};

export default RemindersSection;
