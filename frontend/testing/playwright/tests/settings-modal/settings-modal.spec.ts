import { expect } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Header } from '../../components/Header';
import { LocalChangesModal } from '../../components/LocalChangesModal';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { GiteaPage } from '../../pages/GiteaPage';
import { SettingsModal } from '../../components/SettingsModal';

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

const setupAndVerifyUiEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

const setUpAndOpenSettingsModal = async (
  page: Page,
  testAppName: string,
): Promise<SettingsModal> => {
  const settingsModal = new SettingsModal(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await setupAndVerifyUiEditorPage(page, testAppName);

  await header.clickOnOpenSettingsModalButton();
  await settingsModal.verifyThatSettingsModalIsOpen();
  return settingsModal;
};

test('That it is possible to see and edit information about "About app" tab', async ({
  page,
  testAppName,
}) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

test('That it is possible to change tab to "Setup" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

test('That it is possible to toggle settings on app "Setup" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

// Policy editor should have its own tests
test('That it is possible to change tab to "Policy editor" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

test('That it is possible to change tab to "Access control" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

test('That it is possible to update the settings on "Access control" tab', async ({
  page,
  testAppName,
}) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);
});

test('That it is possible to close the settings modal', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);

  await settingsModal.clickOnCloseSettingsModalButton();
  await settingsModal.verifyThatSettingsModalIsNotOpen();
});
