import React from 'react';
import { Application, ApplicationStatus, TestStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../constants';

interface ApplicationListProps {
  applications: Application[];
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onUpdate: (app: Application) => void;
  hasActiveFilter: boolean;
}

const MaterialIcon: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const ApplicationList: React.FC<ApplicationListProps> = ({ applications, onEdit, onDelete, onUpdate, hasActiveFilter }) => {
  if (applications.length === 0) {
    return (
      <div
        className="text-center py-16 px-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50"
      >
        <div className="bg-slate-100 dark:bg-slate-700/50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <MaterialIcon name={hasActiveFilter ? "filter_list_off" : "post_add"} className="text-4xl text-slate-400 dark:text-slate-500" />
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {hasActiveFilter ? "No matching applications found" : "No applications yet"}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          {hasActiveFilter
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Start tracking your academic journey by adding your first application."}
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
    >
      {applications.map((app, index) => (
        <div
          key={app.id}
          className="group relative bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(app); }}
              className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Edit"
              aria-label="Edit application"
            >
              <MaterialIcon name="edit" className="text-lg" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(app.id); }}
              className="p-2 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-sm hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              title="Delete"
              aria-label="Delete application"
            >
              <MaterialIcon name="delete" className="text-lg" />
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status]}`}>
                {STATUS_LABELS[app.status]}
              </span>
              {app.deadline && (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                  <MaterialIcon name="event" className="text-sm" />
                  {new Date(app.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-1 line-clamp-1" title={app.universityName}>
              {app.universityName}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1" title={app.programName}>
              {app.programName}
            </p>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <MaterialIcon name="school" className="text-sm" />
                {app.programType}
              </span>
              {app.applicationFee > 0 && (
                <span className="flex items-center gap-1.5">
                  <MaterialIcon name="payments" className="text-sm" />
                  ${app.applicationFee}
                </span>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-slate-900 dark:bg-slate-100 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${calculateProgress(app)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const calculateProgress = (app: Application): number => {
  let progress = 0;
  if (app.status === ApplicationStatus.Submitted || app.status === ApplicationStatus.Accepted || app.status === ApplicationStatus.Rejected || app.status === ApplicationStatus.Waitlisted) return 100;

  // Basic info filled (always true if created)
  progress += 10;

  // Documents
  const docs = Object.values(app.documents);
  const requiredDocs = docs.filter(d => d.required);
  const submittedDocs = requiredDocs.filter(d => d.submitted);
  if (requiredDocs.length > 0) {
    progress += (submittedDocs.length / requiredDocs.length) * 50;
  }

  // Faculty contact (bonus if done)
  if (app.facultyContacts.length > 0) progress += 10;

  // Tests
  if (app.englishTest?.status === TestStatus.Taken) progress += 10;
  if (app.gre?.status === TestStatus.Taken) progress += 10;

  return Math.min(100, Math.round(progress));
};

export default ApplicationList;