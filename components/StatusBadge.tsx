import React from 'react';
import { ApplicationStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]} ${className}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

export default StatusBadge;
