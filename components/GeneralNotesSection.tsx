import React from 'react';
import { Application } from '../types';
import { FieldSet } from './ApplicationFormUI';
import MarkdownEditor from './MarkdownEditor';

interface GeneralNotesSectionProps {
    appData: Omit<Application, 'id'>;
    setAppData: React.Dispatch<React.SetStateAction<Omit<Application, 'id'>>>;
}

const GeneralNotesSection: React.FC<GeneralNotesSectionProps> = ({ appData, setAppData }) => {
    return (
        <FieldSet legend="General Notes">
            <MarkdownEditor
                label="Additional notes about this application..."
                value={appData.notes}
                onChange={val => setAppData(prev => ({ ...prev, notes: val }))}
                className="md:col-span-2"
            />
        </FieldSet>
    );
};

export default GeneralNotesSection;
