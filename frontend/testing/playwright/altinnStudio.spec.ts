import { test, expect } from '@playwright/test';

test('has title Altinn Studio', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Altinn Studio/);
});
