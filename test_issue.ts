import { parseLocalDate, getDaysUntil, formatLocalDate } from './utils/dateUtils';

// Simulate loading corrupted deadline data from storage
const corruptedDeadlines = [
  '2026-13-45',  // Invalid month and day
  '2026-12-32',  // Invalid day for December
  '2026-02-30',  // Invalid day for February
  '2026-00-15',  // Invalid month
  '2026-07-01',  // Valid deadline
];

console.log('Current behavior - parseLocalDate silently accepts invalid dates:');
corruptedDeadlines.forEach(deadline => {
  const parsed = parseLocalDate(deadline);
  const daysUntil = getDaysUntil(deadline);
  const formatted = formatLocalDate(deadline);
  console.log(`"${deadline}": parsed=${parsed?.toISOString() || 'null'}, daysUntil=${daysUntil}, formatted="${formatted}"`);
});
