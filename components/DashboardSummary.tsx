import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { Application, ApplicationStatus, FacultyContactStatus } from '../types';
import { STATUS_OPTIONS, CHART_COLORS, FACULTY_CHART_COLORS, FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';
import { format, parseISO, isValid } from 'date-fns';

interface DashboardSummaryProps {
  applications: Application[];
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ applications }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  const [showAnalytics, setShowAnalytics] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const tooltipStyle = {
    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.7)'}`,
    borderRadius: '0.75rem',
    color: isDarkMode ? '#e2e8f0' : '#1e293b',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  };

  // --- Analytics Calculations ---

  const summaryStats = useMemo(() => {
    const total = applications.length;
    const accepted = applications.filter(a => a.status === ApplicationStatus.Accepted).length;
    const rejected = applications.filter(a => a.status === ApplicationStatus.Rejected).length;
    const pending = applications.filter(a =>
      [ApplicationStatus.Submitted, ApplicationStatus.Interview, ApplicationStatus.Waitlisted, ApplicationStatus.InProgress].includes(a.status)
    ).length;
    const upcomingDeadlines = applications.filter(a => {
      if (!a.deadline) return false;
      const date = new Date(a.deadline);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 14; // Next 2 weeks
    }).length;

    return { total, accepted, rejected, pending, upcomingDeadlines };
  }, [applications]);

  const timelineData = useMemo(() => {
    const data: Record<string, number> = {};
    applications.forEach(app => {
      if (app.deadline && isValid(parseISO(app.deadline))) {
        const month = format(parseISO(app.deadline), 'MMM yyyy');
        data[month] = (data[month] || 0) + 1;
      }
    });

    return Object.entries(data)
      .map(([name, count]) => ({ name, count, date: new Date(name) })) // Add date object for sorting
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ name, count }) => ({ name, count }));
  }, [applications]);

  const applicationStatusData = useMemo(() => {
    const counts = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {} as { [key in ApplicationStatus]: number });

    return STATUS_OPTIONS.map(status => ({
      name: status,
      value: counts[status] || 0,
    })).filter(item => item.value > 0);
  }, [applications]);

  const facultyContactSummary = useMemo(() => {
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

  const upcomingInterviews = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const interviews: any[] = [];
    applications.forEach(app => {
      app.facultyContacts.forEach(contact => {
        if (contact.contactStatus === FacultyContactStatus.MeetingScheduled && contact.interviewDate && new Date(contact.interviewDate + 'T00:00:00') >= today) {
          interviews.push({
            app,
            contact,
          });
        }
      });
    });
    return interviews.sort((a, b) => new Date(a.contact.interviewDate!).getTime() - new Date(b.contact.interviewDate!).getTime());
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
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Applications" value={summaryStats.total} icon="folder_open" color="bg-blue-500" />
        <SummaryCard title="Pending / In Progress" value={summaryStats.pending} icon="hourglass_empty" color="bg-amber-500" />
        <SummaryCard title="Accepted" value={summaryStats.accepted} icon="check_circle" color="bg-green-500" />
        <SummaryCard title="Deadlines (14 Days)" value={summaryStats.upcomingDeadlines} icon="event_busy" color="bg-red-500" />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {showAnalytics ? 'expand_less' : 'expand_more'}
          </span>
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
        </button>
      </div>

      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Charts Container */}
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Application Status</h2>
                {applicationStatusData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={applicationStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          nameKey="name"
                        >
                          {applicationStatusData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={CHART_COLORS[entry.name as ApplicationStatus]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
                )}
              </div>

              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Faculty Outreach</h2>
                {facultyContactSummary.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={facultyContactSummary}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="name"
                        >
                          {facultyContactSummary.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={FACULTY_CHART_COLORS[entry.name as FacultyContactStatus]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-400">No faculty contacts logged</div>
                )}
              </div>
            </div>

            {/* Timeline Chart */}
            {timelineData.length > 0 && (
              <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Application Deadlines Timeline</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <LineChart data={timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} vertical={false} />
                      <XAxis dataKey="name" stroke={isDarkMode ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip contentStyle={tooltipStyle} cursor={{ stroke: isDarkMode ? '#475569' : '#cbd5e1', strokeWidth: 2 }} />
                      <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: isDarkMode ? '#1e293b' : '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {upcomingInterviews.length > 0 && (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-6 rounded-3xl shadow-lg border border-slate-200/50 dark:border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Upcoming Interviews</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingInterviews.map(({ app, contact }) => (
              <div key={`${app.id}-${contact.id}`} className="p-4 rounded-xl bg-white dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 shadow-sm flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <span className="material-symbols-outlined">video_camera_front</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{app.universityName}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{contact.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(contact.interviewDate! + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-700/50 flex items-center gap-4">
    <div className={`h-12 w-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center shrink-0`}>
      <span className={`material-symbols-outlined ${color.replace('bg-', 'text-')}`}>{icon}</span>
    </div>
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  </div>
);

export default DashboardSummary;