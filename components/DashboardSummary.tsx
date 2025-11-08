import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as BarTooltip } from 'recharts';
import { Application, ApplicationStatus, FacultyContactStatus } from '../types';
import { STATUS_OPTIONS, CHART_COLORS, FACULTY_CHART_COLORS, FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';

interface DashboardSummaryProps {
  applications: Application[];
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ applications }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const tooltipStyle = {
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
    borderRadius: '0.75rem',
    color: isDarkMode ? '#e2e8f0' : '#1e293b'
  };

  const applicationStatusData = React.useMemo(() => {
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as { [key in ApplicationStatus]: number });

    return STATUS_OPTIONS.map(status => ({
      name: status,
      value: counts[status] || 0,
    })).filter(item => item.value > 0);
  }, [applications]);

  const facultyContactSummary = React.useMemo(() => {
    const counts = applications.reduce((acc, app) => {
      (app.facultyContacts || []).forEach(contact => {
        if (contact.name && contact.contactStatus) {
          acc[contact.contactStatus] = (acc[contact.contactStatus] || 0) + 1;
        }
      });
      return acc;
    }, {} as Record<FacultyContactStatus, number>);
    
    return FACULTY_CONTACT_STATUS_OPTIONS
      .map(status => ({
        name: status,
        count: counts[status] || 0,
      }))
      .filter(item => item.count > 0);
  }, [applications]);

  if (applications.length === 0) {
    return (
       <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-8">
        <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200">Welcome to AcademiaTrack!</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Click "Add New" to get started and see your dashboard come to life.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 sm:p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Application Status</h2>
          {applicationStatusData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={applicationStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {applicationStatusData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[entry.name as ApplicationStatus]} stroke={isDarkMode ? '#0f172a' : '#f8fafc'} strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No application statuses to display.</p>
            </div>
          )}
        </div>
        <div className="border-t lg:border-t-0 lg:border-l border-slate-200/50 dark:border-slate-700/50 lg:pl-8 pt-6 lg:pt-0">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Faculty Outreach</h2>
          {facultyContactSummary.length > 0 ? (
            <div className="h-64 w-full">
               <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facultyContactSummary} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <BarTooltip
                    cursor={{ fill: 'rgba(125, 125, 125, 0.1)' }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="count" barSize={20} radius={[0, 10, 10, 0]}>
                    {facultyContactSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={FACULTY_CHART_COLORS[entry.name as FacultyContactStatus]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No faculty contacts logged yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardSummary;