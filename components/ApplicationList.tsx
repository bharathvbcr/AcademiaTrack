import React from 'react';
import { Application } from '../types';
import ApplicationCard from './ApplicationCard';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  hasActiveFilter: boolean;
}

const ApplicationList: React.FC<ApplicationListProps> = ({ applications, onEdit, onDelete, onUpdate, hasActiveFilter }) => {
  if (applications.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {applications.map(app => (
          <ApplicationCard key={app.id} application={app} onEdit={onEdit} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </div>
    );
  }

  if (hasActiveFilter) {
    return (
      <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">No Applications Found</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Try adjusting your search query.</p>
      </div>
    );
  }
  
  // When the initial list is empty, the DashboardSummary component shows a message.
  return null;
};

export default ApplicationList;