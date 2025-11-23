import React from 'react';
import { Application } from '../types';
import { STATUS_OPTIONS, FEE_WAIVER_STATUS_OPTIONS } from '../constants';
import { FieldSet, Input, Select } from './ApplicationFormUI';

interface SubmissionDetailsSectionProps {
    appData: Omit<Application, 'id'>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    handleNumericChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SubmissionDetailsSection: React.FC<SubmissionDetailsSectionProps> = ({ appData, handleChange, handleNumericChange }) => {
    return (
        <FieldSet legend="Submission Details">
            <Select label="Application Status" name="status" value={appData.status} onChange={handleChange}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Submission Portal Link" name="portalLink" type="url" value={appData.portalLink} onChange={handleChange} />
            <Input label="Application Fee ($)" name="applicationFee" type="number" value={appData.applicationFee} onChange={handleNumericChange} min="0" />
            <Select label="Fee Waiver Status" name="feeWaiverStatus" value={appData.feeWaiverStatus} onChange={handleChange}>
                {FEE_WAIVER_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
        </FieldSet>
    );
};

export default SubmissionDetailsSection;
