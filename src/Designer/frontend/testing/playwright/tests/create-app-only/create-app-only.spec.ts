import { expect } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { test } from '../../extenders/testExtend';
import { CreateServicePage } from '../../pages/CreateServicePage';
import { DashboardPage } from '../../pages/DashboardPage';

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

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
