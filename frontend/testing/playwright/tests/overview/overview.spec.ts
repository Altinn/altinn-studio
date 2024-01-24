import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { OverviewPage } from 'testing/playwright/pages/OverviewPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the dashboard app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyOverviewPage = async (
  page: Page,
  testAppName: string,
): Promise<OverviewPage> => {
  const overviewPage = new OverviewPage(page, { app: testAppName });
  await overviewPage.loadOverviewPage();
  await overviewPage.verifyOverviewPage();
  return overviewPage;
};

test('That it is possible to navigate ', async ({ page, testAppName }) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
});

/*
test('', async ({ page, testAppName }) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
});
*/
