import { test } from '@playwright/test';
import { CreateServicePage } from '../pages/CreateServicePage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('create-app-and-simple-schema', () => {
  test('should load dashboard and be able to navigate to create app', async ({
    page,
  }): Promise<void> => {
    const dashboardPage = new DashboardPage(page);

    await dashboardPage.goToDashboard();
    await dashboardPage.clickOnCreateAppLink();
    await dashboardPage.confirmNavigationToCreateAppForm();
  });

  test('create app with name "simple-app-test"', async ({ page }): Promise<void> => {
    const createServicePage = new CreateServicePage(page);

    await createServicePage.goToCreateAppForm();
    await createServicePage.writeAppName('simple-app-test');
    await createServicePage.clickOnCreateAppButton();
    await createServicePage.redirectedToEditorOverview();
  });
});


