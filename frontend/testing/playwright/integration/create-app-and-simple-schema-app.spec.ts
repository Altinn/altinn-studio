import { test } from '../playwright.config';
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

  test('create app with name "simple-app-test"', async ({ page, testAppName }): Promise<void> => {
    const createServicePage = new CreateServicePage(page);

    await createServicePage.goToCreateAppForm();
    await createServicePage.writeAppName(testAppName);
    await createServicePage.clickOnCreateAppButton();
    await createServicePage.redirectedToEditorOverview();
  });
});


