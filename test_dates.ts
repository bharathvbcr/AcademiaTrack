import { parseLocalDate, getDaysUntil } from './utils/dateUtils';

console.log('Testing parseLocalDate with invalid inputs:');
console.log('2026-13-45:', parseLocalDate('2026-13-45'));
console.log('2026-13-01:', parseLocalDate('2026-13-01'));
console.log('2026-12-32:', parseLocalDate('2026-12-32'));
console.log('2026-00-15:', parseLocalDate('2026-00-15'));
console.log('2026-07-01:', parseLocalDate('2026-07-01'));

console.log('\nTesting getDaysUntil with invalid inputs:');
console.log('2026-13-45:', getDaysUntil('2026-13-45'));
console.log('2026-13-01:', getDaysUntil('2026-13-01'));
console.log('2026-12-32:', getDaysUntil('2026-12-32'));
console.log('2026-00-15:', getDaysUntil('2026-00-15'));
