import { Scenario, Given, When, Then } from '../../extenders/testExtend';
import { CreateServicePage } from '../../pages/CreateServicePage';
import { DashboardPage } from '../../pages/DashboardPage';

Scenario('User should be able to navigate to create app form', () => {
  Given('that the user is on dashboard page', async ({ page }): Promise<void> => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.loadAndVerifyDashboardPage();
  });

  When('the user clicks on create app link', async ({ page }): Promise<void> => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.clickOnCreateAppLink();
  });

  Then('the create app form is visible', ({ page }): void => {
    const createServicePage = new CreateServicePage(page);
    createServicePage.createAppFormIsVisible();
  });
});

Scenario('User should be able to create a app', () => {
  Given('that the user is on create app page', ({ page }): void => {
    const createServicePage = new CreateServicePage(page);
    createServicePage.loadCreateAppFormPage();
  });

  When(
    'the user fill out form and clicks create app',
    async ({ page, testAppName }): Promise<void> => {
      const createServicePage = new CreateServicePage(page);
      await createServicePage.writeAppName(testAppName);
      await createServicePage.clickOnCreateAppButton();
    },
  );

  Then('the user should be redirected to overview page', async ({ page }): Promise<void> => {
    const createServicePage = new CreateServicePage(page);
    await createServicePage.verifyIsOverviewPage();
  });
});
