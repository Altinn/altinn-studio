import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { DashboardPage } from 'testing/playwright/pages/DashboardPage';
import { OverviewPage } from 'testing/playwright/pages/OverviewPage';
import { Gitea } from '../../helpers/Gitea';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the dashboard app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create 2 apps
  const testAppName2: string = `${testAppName}2`;
  const firstApp = await createApp(testAppName, request, storageState as StorageState);
  const secondApp = await createApp(testAppName2, request, storageState as StorageState);

  expect(firstApp.ok()).toBeTruthy();
  expect(secondApp.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const appsToDelete: string[] = [testAppName, `${testAppName}2`];

  for (const app of appsToDelete) {
    const response = await request.delete(gitea.getDeleteAppEndpoint({ app }));
    expect(response.ok()).toBeTruthy();
  }
});

const createApp = async (
  appName: string,
  request: APIRequestContext,
  storageState: StorageState,
) => {
  const designerApi = new DesignerApi({ app: appName });
  return await designerApi.createApp(request, storageState);
};

const setupAndVerifyDashboardPage = async (
  page: Page,
  testAppName: string,
): Promise<DashboardPage> => {
  const dashboardPage = new DashboardPage(page, { app: testAppName });
  await dashboardPage.loadDashboardPage();
  await dashboardPage.verifyDashboardPage();
  return dashboardPage;
};

test('It is possible to view apps, and add and remove from favourites', async ({
  page,
  testAppName,
}) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);

  await dashboardPage.checkThatThereIsNoFavouriteAppInList(testAppName);
  await dashboardPage.clickOnFavouriteApplication(testAppName);
  await dashboardPage.checkThatThereIsFavouriteAppInList(testAppName);
  await dashboardPage.clickOnUnFavouriteApplicatin(testAppName);
  await dashboardPage.checkThatThereIsNoFavouriteAppInList(testAppName);
});

test('It is possible to change context and view all apps', async ({ page, testAppName }) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnAllApplications();
  await dashboardPage.checkThatAllApplicationsHeaderIsVisible();
});

test('It is possible to change context and view only Testdepartementet apps', async ({
  page,
  testAppName,
}) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnOrgApplications();
  await dashboardPage.checkThatTTDApplicationsHeaderIsVisible();
});

test('It is possible to search an app by name', async ({ page, testAppName }) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);
  const testAppName2 = `${testAppName}2`;

  await dashboardPage.checkThatAppIsVisible(testAppName);
  await dashboardPage.checkThatAppIsVisible(testAppName2);

  await dashboardPage.typeInSearchField('2');
  await dashboardPage.checkThatAppIsHidden(testAppName);
  await dashboardPage.checkThatAppIsVisible(testAppName2);
});

test('It is possible to open Gitea repository of an app from the dashboard', async ({
  page,
  testAppName,
}) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);

  await dashboardPage.clickOnTestAppGiteaButton(testAppName);
  await dashboardPage.verifyGiteaPage();
});

test('It is possible to open an application from the dashboard', async ({ page, testAppName }) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);
  const overviewPage = new OverviewPage(page, { app: testAppName });

  await dashboardPage.clickOnTestAppEditButton(testAppName);
  await overviewPage.verifyOverviewPage();
});
