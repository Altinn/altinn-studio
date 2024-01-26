import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { OverviewPage } from '../../pages/OverviewPage';
import { Header } from '../../components/Header';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { GiteaPage } from '../../pages/GiteaPage';

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
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

test('1', async ({ page, testAppName }) => {
  const uiEditorPage = await setupAndVerifyOverviewPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  // Make changes
  const newPageName: string = 'Side2';
  await uiEditorPage.verifyThatNewPageIsVisible(newPageName);
  await uiEditorPage.clickOnAddNewPage();
  await uiEditorPage.verifyThatNewPageIsVisible(newPageName);

  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  // Verify that there is no page
  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutsFilesButton();
  await giteaPage.verifyThatTheNewPageIsNotPresent();

  // Click push

  // Verify page is there

  //
});

// PULL

// PUSH
// - Navigate to Gitea, view the changes

// DELETE LOCAL CHANGES

//
