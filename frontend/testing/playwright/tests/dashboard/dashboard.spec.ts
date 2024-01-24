import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { DashboardPage } from 'testing/playwright/pages/DashboardPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the dashboard app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();

  // Create another new app
  const designerApi1 = new DesignerApi({ app: `${testAppName}2` });
  const response1 = await designerApi1.createApp(request, storageState as StorageState);
  expect(response1.ok()).toBeTruthy();
});

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
  await dashboardPage.checkThatAllOrgApplicationsHeaderIsVisible();
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
  await dashboardPage.verifyGiteaPage(testAppName);
});

test('It is possible to open an application from the dashboard', async ({ page, testAppName }) => {
  const dashboardPage = await setupAndVerifyDashboardPage(page, testAppName);

  await dashboardPage.clickOnTestAppEditButton(testAppName);
  await dashboardPage.verifyEditorOverviewPage();
});
