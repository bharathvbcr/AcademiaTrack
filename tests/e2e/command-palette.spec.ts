import { test, expect } from '@playwright/test';

test.describe('Command Palette E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('opens command palette with Ctrl+K', async ({ page }) => {
    await page.keyboard.press('Control+k');
    const palette = page.locator('placeholder=Type to search... (> actions, @ apps, # filters)');
    await expect(palette).toBeVisible();
  });

  test('executes a command from the palette', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await page.fill('input[placeholder*="Type to search"]', 'Switch to Kanban View');
    await page.keyboard.press('Enter');
    
    // Verify view mode changed (Kanban board should be visible)
    const kanbanBoard = page.locator('.kanban-board');
    await expect(kanbanBoard).toBeVisible();
  });

  test('filters and selects dynamic application results', async ({ page }) => {
    // Wait for applications to load if needed
    // Assuming there might be some default data or we can add one
    
    await page.keyboard.press('Control+k');
    await page.fill('input[placeholder*="Type to search"]', '@');
    
    // Should show applications group
    await expect(page.getByText('APPLICATIONS')).toBeVisible();
  });

  test('closes with Escape', async ({ page }) => {
    await page.keyboard.press('Control+k');
    await expect(page.locator('input[placeholder*="Type to search"]')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('input[placeholder*="Type to search"]')).toHaveCount(0);
  });
});
