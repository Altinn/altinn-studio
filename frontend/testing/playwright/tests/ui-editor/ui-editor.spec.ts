import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { UiEditorPage } from '../../pages/UiEditorPage';

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

const setupAndVerifyDashboardPage = async (
  page: Page,
  testAppName: string,
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

test('That it is possible to add and delete form components', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyDashboardPage(page, testAppName);

  const page1: string = 'Side1';
  await uiEditorPage.clickOnPageAccordion(page1);
  await uiEditorPage.verifyThatPageIsEmpty();
  await uiEditorPage.verifyUiEditorPage('Side1'); // When clicking the page, the url is updated to include the layout

  await uiEditorPage.dragTitleInputComponentInToDroppableList();
  await uiEditorPage.verifyThatInputComponentTreeItemIsVisibleInDroppableList();
  await uiEditorPage.verifyThatPageEmptyMessageIsGone();
  await uiEditorPage.clickOnDeleteInputComponentButton();

  await uiEditorPage.verifyThatPageIsEmpty();
});

//test('', async ({ page, testAppName }): Promise<void> => {});
