import { test } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test('create app', async ({ page }): Promise<void> => {
  const dashboardPage = new DashboardPage(page);

  await dashboardPage.goToDashboard();
  await dashboardPage.clickOnCreateAppLink();
  await dashboardPage.confirmNavigationToCreateAppForm();
  await dashboardPage.writeAppName(app);
  await dashboardPage.clickOnCreateAppButton();
  await dashboardPage.verifyCreateAppIsSuccessful();
});
