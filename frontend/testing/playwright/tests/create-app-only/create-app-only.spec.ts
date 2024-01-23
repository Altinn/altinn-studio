import { test } from '../../extenders/testExtend';
import { CreateServicePage } from '../../pages/CreateServicePage';
import { DashboardPage } from '../../pages/DashboardPage';

test('should load dashboard and the user should navigate to create app form', async ({
  page,
}): Promise<void> => {
  const dashboardPage = new DashboardPage(page);
  const createServicePage = new CreateServicePage(page);

  await dashboardPage.loadDashboardPage();
  await dashboardPage.verifyDashboardPage();
  await dashboardPage.clickOnCreateAppLink();
  await createServicePage.verifyCreateAppFormPage();
});

test('should be able to create new app', async ({ page, testAppName }): Promise<void> => {
  const createServicePage = new CreateServicePage(page);
  await createServicePage.loadCreateAppFormPage();
  await createServicePage.writeAppName(testAppName);
  await createServicePage.clickOnCreateAppButton();
  await createServicePage.verifyIsNavigatedToOverviewPage();
});
