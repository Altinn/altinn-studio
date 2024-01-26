import { expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { OverviewPage } from 'testing/playwright/pages/OverviewPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the data model app
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

test('1', async ({ page, testAppName }) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);

  // Make changes
  await overviewPage.clickOnOpenSettingsModalButton(); // Maybe change to header.
  await overviewPage.changeAlternativeIdOnApp('a'); // Maybe change to settingsModal.
  await overviewPage.clickOnCloseModalButton();

  //
});

// PULL

// PUSH
// - Navigate to Gitea, view the changes

// DELETE LOCAL CHANGES

//
