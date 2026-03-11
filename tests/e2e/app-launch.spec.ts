import { test, expect } from '@playwright/test';

test.describe('Application Launch', () => {
    test('desktop launch smoke test is pending electrobun harness support', async () => {
        test.skip(true, 'The previous Playwright harness used desktop launch APIs that no longer match the Electrobun runtime.');
        expect(true).toBe(true);
    });
});
