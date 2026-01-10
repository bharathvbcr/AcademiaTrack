import { useMemo } from 'react';
import { Application, ApplicationStatus } from '../types';

export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: number;
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label: string;
}

export const useAdvancedAnalytics = (applications: Application[]) => {
  const statusDistribution = useMemo(() => {
    const distribution: { [key in ApplicationStatus]?: number } = {};
    applications.forEach(app => {
      distribution[app.status] = (distribution[app.status] || 0) + 1;
    });
    return distribution;
  }, [applications]);

  const acceptanceRate = useMemo(() => {
    const submitted = applications.filter(app => 
      app.status === ApplicationStatus.Submitted ||
      app.status === ApplicationStatus.Accepted ||
      app.status === ApplicationStatus.Rejected ||
      app.status === ApplicationStatus.Waitlisted
    ).length;
    
    const accepted = applications.filter(app => 
      app.status === ApplicationStatus.Accepted
    ).length;

    return submitted > 0 ? Math.round((accepted / submitted) * 100) : 0;
  }, [applications]);

  const averageTimeToDecision = useMemo(() => {
    const decisions = applications.filter(app => {
      if (app.status !== ApplicationStatus.Accepted && 
          app.status !== ApplicationStatus.Rejected && 
          app.status !== ApplicationStatus.Waitlisted) {
        return false;
      }
      if (!app.deadline || !app.statusHistory) return false;
      return true;
    });

    if (decisions.length === 0) return null;

    const times: number[] = [];
    decisions.forEach(app => {
      const submittedDate = app.statusHistory?.find(s => s.status === ApplicationStatus.Submitted);
      const decisionDate = app.statusHistory?.find(s => 
        s.status === ApplicationStatus.Accepted || 
        s.status === ApplicationStatus.Rejected || 
        s.status === ApplicationStatus.Waitlisted
      );
      
      if (submittedDate && decisionDate) {
        const submitted = new Date(submittedDate.timestamp);
        const decision = new Date(decisionDate.timestamp);
        const days = Math.ceil((decision.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
        times.push(days);
      }
    });

    return times.length > 0 
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null;
  }, [applications]);

  const averageApplicationFee = useMemo(() => {
    const fees = applications
      .map(app => app.applicationFee)
      .filter(fee => fee > 0);
    
    return fees.length > 0
      ? Math.round(fees.reduce((a, b) => a + b, 0) / fees.length)
      : 0;
  }, [applications]);

  const totalSpent = useMemo(() => {
    return applications.reduce((sum, app) => {
      const fee = app.feeWaiverStatus === 'Granted' ? 0 : app.applicationFee;
      return sum + fee;
    }, 0);
  }, [applications]);

  const averageAdmissionChance = useMemo(() => {
    const chances = applications
      .map(app => app.admissionChance)
      .filter((chance): chance is number => chance !== undefined);
    
    return chances.length > 0
      ? Math.round(chances.reduce((a, b) => a + b, 0) / chances.length)
      : null;
  }, [applications]);

  const statusTrend = useMemo((): TrendDataPoint[] => {
    // Group by month based on status history
    const monthlyData: { [key: string]: { [key in ApplicationStatus]?: number } } = {};
    
    applications.forEach(app => {
      if (!app.statusHistory) return;
      app.statusHistory.forEach(change => {
        const date = new Date(change.timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {};
        }
        monthlyData[monthKey][change.status] = (monthlyData[monthKey][change.status] || 0) + 1;
      });
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, statuses]) => ({
        date,
        value: Object.values(statuses).reduce((a, b) => (a || 0) + (b || 0), 0),
        label: date,
      }));
  }, [applications]);

  const programTypeDistribution = useMemo(() => {
    const distribution: { [key: string]: number } = {};
    applications.forEach(app => {
      const type = app.programType;
      distribution[type] = (distribution[type] || 0) + 1;
    });
    return distribution;
  }, [applications]);

  const deadlineUrgency = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgent = applications.filter(app => {
      if (!app.deadline || app.status === ApplicationStatus.Submitted) return false;
      const deadline = new Date(app.deadline);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    const upcoming = applications.filter(app => {
      if (!app.deadline || app.status === ApplicationStatus.Submitted) return false;
      const deadline = new Date(app.deadline);
      const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays > 7 && diffDays <= 30;
    }).length;

    return { urgent, upcoming };
  }, [applications]);

  const metrics: AnalyticsMetric[] = useMemo(() => [
    {
      id: 'total-applications',
      name: 'Total Applications',
      value: applications.length,
    },
    {
      id: 'acceptance-rate',
      name: 'Acceptance Rate',
      value: acceptanceRate,
      unit: '%',
    },
    {
      id: 'avg-time-decision',
      name: 'Avg Time to Decision',
      value: averageTimeToDecision || 'N/A',
      unit: averageTimeToDecision ? 'days' : undefined,
    },
    {
      id: 'avg-fee',
      name: 'Average Application Fee',
      value: averageApplicationFee,
      unit: '$',
    },
    {
      id: 'total-spent',
      name: 'Total Spent',
      value: totalSpent,
      unit: '$',
    },
    {
      id: 'avg-admission-chance',
      name: 'Average Admission Chance',
      value: averageAdmissionChance || 'N/A',
      unit: averageAdmissionChance ? '%' : undefined,
    },
    {
      id: 'urgent-deadlines',
      name: 'Urgent Deadlines (≤7 days)',
      value: deadlineUrgency.urgent,
    },
    {
      id: 'upcoming-deadlines',
      name: 'Upcoming Deadlines (8-30 days)',
      value: deadlineUrgency.upcoming,
    },
  ], [
    applications.length,
    acceptanceRate,
    averageTimeToDecision,
    averageApplicationFee,
    totalSpent,
    averageAdmissionChance,
    deadlineUrgency,
  ]);

  const forecastAcceptance = useMemo(() => {
    // Simple forecasting based on current acceptance rate and pending applications
    const pending = applications.filter(app => 
      app.status === ApplicationStatus.Submitted ||
      app.status === ApplicationStatus.Interview
    ).length;

    if (acceptanceRate === 0 || pending === 0) return null;

    const expectedAccepted = Math.round((pending * acceptanceRate) / 100);
    return {
      pendingApplications: pending,
      expectedAccepted,
      confidence: 'medium' as const,
    };
  }, [applications, acceptanceRate]);

  return {
    metrics,
    statusDistribution,
    programTypeDistribution,
    acceptanceRate,
    averageTimeToDecision,
    averageApplicationFee,
    totalSpent,
    averageAdmissionChance,
    statusTrend,
    deadlineUrgency,
    forecastAcceptance,
  };
};
