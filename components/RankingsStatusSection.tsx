import React from 'react';
import { Application } from '../types';
import { FieldSet, Input } from './ApplicationFormUI';

interface RankingsStatusSectionProps {
    appData: Omit<Application, 'id'>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const RankingsStatusSection: React.FC<RankingsStatusSectionProps> = ({ appData, handleChange, handleCheckboxChange }) => {
    return (
        <FieldSet legend="Rankings & Status">
            <Input label="University Ranking" name="universityRanking" value={appData.universityRanking} onChange={handleChange} />
            <Input label="Department Ranking" name="departmentRanking" value={appData.departmentRanking} onChange={handleChange} />
            <div className="flex items-center mt-2 md:col-span-2">
                <input id="isR1" name="isR1" type="checkbox" checked={appData.isR1} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-slate-400 text-red-600 focus:ring-red-500" />
                <label htmlFor="isR1" className="ml-2 block text-sm text-slate-800 dark:text-slate-200">R1 / Tier 1 University</label>
            </div>
        </FieldSet>
    );
};

export default RankingsStatusSection;
