import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application, ApplicationStatus, FacultyContactStatus } from '../types';
import { STATUS_OPTIONS, CHART_COLORS, FACULTY_CHART_COLORS, FACULTY_CONTACT_STATUS_OPTIONS } from '../constants';
import { format, parseISO, isValid } from 'date-fns';

interface DashboardSummaryProps {
  applications: Application[];
  viewMode?: 'list' | 'kanban' | 'calendar' | 'budget' | 'faculty' | 'recommenders' | 'timeline';
}

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ applications, viewMode = 'list' }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  // Auto-hide analytics on non-list views, but allow manual toggle
  const [userPreference, setUserPreference] = useState<boolean | null>(null);
  const showAnalytics = userPreference !== null ? userPreference : viewMode === 'list';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  void isDarkMode;

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

    // Calculate total cost spent
    const totalCost = applications.reduce((sum, app) => {
      const fee = app.applicationFee || 0;
      const waived = app.feeWaiverStatus === 'Granted';
      return sum + (waived ? 0 : fee);
    }, 0);

    return { total, accepted, rejected, pending, upcomingDeadlines, totalCost };
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
      <div className="text-center py-16 px-6 liquid-glass-card rounded-3xl mb-8">
        <img src="./AcademiaTrack.png" alt="AcademiaTrack" className="w-16 h-16 object-contain mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-[#f4f4f5]">Welcome to AcademiaTrack!</h2>
        <p className="text-[#a1a1aa] mt-2">Click "Add New" to get started and see your dashboard come to life.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard title="Total Applications" value={summaryStats.total} icon="folder_open" color="text-blue-500" />
        <SummaryCard title="Pending / In Progress" value={summaryStats.pending} icon="hourglass_empty" color="text-amber-500" />
        <SummaryCard title="Accepted" value={summaryStats.accepted} icon="check_circle" color="text-green-500" />
        <SummaryCard title="Deadlines (14 Days)" value={summaryStats.upcomingDeadlines} icon="event_busy" color="text-red-500" />
        <SummaryCard title="Rejected" value={summaryStats.rejected} icon="cancel" color="text-rose-500" />
        <SummaryCard
          title="Total Cost Spent"
          value={`$${summaryStats.totalCost.toLocaleString()}`}
          icon="payments"
          color="text-emerald-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setUserPreference(!showAnalytics)}
          className="flex items-center gap-2 text-sm font-medium text-[#a1a1aa] hover:text-[#F5D7DA] transition-colors"
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
              <div className="liquid-glass-card p-6 rounded-3xl bg-[#18181b] border border-[#27272a]">
                <h2 className="text-lg font-semibold text-[#f4f4f5] mb-4">Application Status</h2>
                {applicationStatusData.length > 0 ? (
                  <DistributionList
                    data={applicationStatusData.map(item => ({
                      name: item.name,
                      value: item.value,
                      color: CHART_COLORS[item.name as ApplicationStatus] || '#71717a',
                    }))}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#a1a1aa]/50">No data available</div>
                )}
              </div>

              <div className="liquid-glass-card p-6 rounded-3xl bg-[#18181b] border border-[#27272a]">
                <h2 className="text-lg font-semibold text-[#f4f4f5] mb-4">Faculty Outreach</h2>
                {facultyContactSummary.length > 0 ? (
                  <DistributionList
                    data={facultyContactSummary.map(item => ({
                      name: item.name,
                      value: item.count,
                      color: FACULTY_CHART_COLORS[item.name as FacultyContactStatus] || '#71717a',
                    }))}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-[#a1a1aa]/50">No faculty contacts logged</div>
                )}
              </div>
            </div>

            {/* Timeline Chart */}
            {timelineData.length > 0 && (
              <div className="liquid-glass-card p-6 rounded-3xl bg-[#18181b] border border-[#27272a]">
                <h2 className="text-lg font-semibold text-[#f4f4f5] mb-4">Application Deadlines Timeline</h2>
                <TimelineBars data={timelineData} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {
        upcomingInterviews.length > 0 && (
          <div className="liquid-glass-card p-6 rounded-3xl bg-[#18181b] border border-[#27272a]">
            <h2 className="text-lg font-semibold text-[#f4f4f5] mb-4">Upcoming Interviews</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingInterviews.map(({ app, contact }) => (
                <div key={`${app.id}-${contact.id}`} className="p-4 rounded-xl border border-[#27272a] bg-[#18181b] flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-[#27272a] flex items-center justify-center text-[#dc2626]">
                    <span className="material-symbols-outlined">video_camera_front</span>
                  </div>
                  <div>
                    <p className="font-bold text-[#f4f4f5]">{app.universityName}</p>
                    <p className="text-sm text-[#a1a1aa]">{contact.name}</p>
                    <p className="text-xs text-[#a1a1aa]/50 mt-1">
                      {new Date(contact.interviewDate! + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }
    </div >
  );
};

const SummaryCard: React.FC<{ title: string; value: number | string; icon: string; color: string }> = ({ title, value, icon, color }) => (
  <div className="p-4 rounded-xl border border-[#27272a] bg-[#18181b] flex items-center gap-4 hover:border-[#3f3f46] transition-colors">
    <div className={`h-12 w-12 rounded-xl bg-opacity-0 flex items-center justify-center shrink-0`}>
      <span className={`material-symbols-outlined ${color}`}>{icon}</span>
    </div>
    <div>
      <p className="text-xs font-medium text-[#a1a1aa] uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-[#f4f4f5]">{value}</p>
    </div>
  </div>
);

const DistributionList: React.FC<{ data: Array<{ name: string; value: number; color: string }> }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-3">
      {data.map(item => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#f4f4f5]">{item.name}</span>
              <span className="text-[#a1a1aa]">{item.value}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#27272a]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TimelineBars: React.FC<{ data: Array<{ name: string; count: number }> }> = ({ data }) => {
  const max = Math.max(...data.map(item => item.count), 1);

  return (
    <div className="flex h-56 items-end gap-3 overflow-x-auto pb-2">
      {data.map(item => (
        <div key={item.name} className="flex min-w-20 flex-1 flex-col items-center gap-2">
          <div className="flex h-40 w-full items-end">
            <div
              className="w-full rounded-t-lg bg-[#dc2626]"
              style={{ height: `${Math.max((item.count / max) * 100, 8)}%` }}
              title={`${item.name}: ${item.count}`}
            />
          </div>
          <div className="text-center text-xs text-[#a1a1aa]">{item.name}</div>
        </div>
      ))}
    </div>
  );
};

export default DashboardSummary;
