import { test } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';

test('create app', async ({ page }): Promise<void> => {
  const org: string = process.env.PLAYWRIGHT_USER;
  const app: string = 'demo-cypress-app7';
  const dashboardPage = new DashboardPage(page, org, app);

  await dashboardPage.goToDashboard();
  await dashboardPage.clickOnCreateAppLink();
  await dashboardPage.confirmNavigationToCreateAppForm();
  await dashboardPage.writeAppName(app);
  await dashboardPage.clickOnCreateAppButton();
  await dashboardPage.verifyCreateAppIsSuccessful();
});
