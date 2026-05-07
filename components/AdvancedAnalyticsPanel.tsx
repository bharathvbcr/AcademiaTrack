import React from 'react';
import { Application } from '../types';
import { useAdvancedAnalytics } from '../hooks/useAdvancedAnalytics';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface AdvancedAnalyticsPanelProps {
  applications: Application[];
}

const AdvancedAnalyticsPanel: React.FC<AdvancedAnalyticsPanelProps> = ({ applications }) => {
  const [enabled] = useLocalStorage<boolean>('analytics-tracking-enabled', false);
  const { metrics, forecastAcceptance } = useAdvancedAnalytics(applications);

  if (!enabled || applications.length === 0) {
    return null;
  }

  return (
    <section className="my-6 rounded-xl border border-[#27272a] bg-[#18181b]/80 p-4 text-[#f4f4f5]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Advanced Analytics</h2>
          <p className="text-sm text-[#a1a1aa]">Derived from local application data.</p>
        </div>
        {forecastAcceptance && (
          <div className="text-right text-sm text-[#a1a1aa]">
            {forecastAcceptance.expectedAccepted} expected acceptances from {forecastAcceptance.pendingApplications} pending
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.id} className="rounded-lg border border-[#27272a] bg-[#09090b] p-3">
            <div className="text-xs text-[#a1a1aa]">{metric.name}</div>
            <div className="mt-1 text-lg font-semibold">
              {metric.unit === '$' ? '$' : ''}{metric.value}{metric.unit && metric.unit !== '$' ? metric.unit : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AdvancedAnalyticsPanel;
