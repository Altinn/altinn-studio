import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';
import { UiEditorPage } from '../../pages/UiEditorPage';
import type { SettingsModalTab } from '../../components/SettingsModal';
import { SettingsModal } from '../../components/SettingsModal';
import { PolicyEditor } from '../../components/PolicyEditor';
import { Gitea } from 'testing/playwright/helpers/Gitea';

// Before the tests starts, we need to create the data model app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyUiEditorPage = async (page: Page, testAppName: string): Promise<void> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
};

const setUpAndOpenSettingsModal = async (
  page: Page,
  testAppName: string,
  tabToStartAt: SettingsModalTab = 'about',
): Promise<SettingsModal> => {
  const settingsModal = new SettingsModal(page, { app: testAppName });
  const header = new AppDevelopmentHeader(page, { app: testAppName });

  await setupAndVerifyUiEditorPage(page, testAppName);

  await header.clickOnOpenSettingsModalButton();
  await settingsModal.verifyThatSettingsModalIsOpen();

  if (tabToStartAt !== 'about') {
    settingsModal.navigateToTab(tabToStartAt);
  }

  return settingsModal;
};

test('That it is possible to change tab from "About app" tab to "Setup" tab', async ({
  page,
  testAppName,
}) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);

  await settingsModal.verifyThatTabIsVisible('about');
  await settingsModal.verifyThatTabIsHidden('setup');

  await settingsModal.navigateToTab('setup');

  await settingsModal.verifyThatTabIsHidden('about');
  await settingsModal.verifyThatTabIsVisible('setup');
});

test('That it is possible to change tab to "Policy editor" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName, 'setup');

  await settingsModal.verifyThatTabIsVisible('setup');
  await settingsModal.verifyThatTabIsHidden('policy');

  await settingsModal.navigateToTab('policy');

  await settingsModal.verifyThatTabIsHidden('setup');
  await settingsModal.verifyThatTabIsVisible('policy');
});

test('That it is possible to edit security level on "Policy editor" tab, and that changes are saved', async ({
  page,
  testAppName,
}) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName, 'policy');
  await settingsModal.verifyThatTabIsVisible('policy');

  const policyEditor = new PolicyEditor(page, { app: testAppName });
  await policyEditor.selectRulesTab();

  const securityLevel2 = 2;
  policyEditor.verifySelectedSecurityLevel(securityLevel2);

  const securityLevel3 = 3;
  await policyEditor.selectSecurityLevel(securityLevel3);
  policyEditor.verifySelectedSecurityLevel(securityLevel3);

  // In dev, the API call to save the policy takes some time, and therefore we add functionality to wait for a while to wait for the save to happen
  await settingsModal.waitForXAmountOfMilliseconds(4000);

  await settingsModal.navigateToTab('about');
  await settingsModal.verifyThatTabIsVisible('about');
  await settingsModal.verifyThatTabIsHidden('policy');

  await settingsModal.navigateToTab('policy');

  policyEditor.verifySelectedSecurityLevel(securityLevel3);
});

test('That it is possible to change tab to "Access control" tab', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName, 'policy');

  await settingsModal.verifyThatTabIsVisible('policy');
  await settingsModal.verifyThatTabIsHidden('access_control');

  await settingsModal.navigateToTab('access_control');

  await settingsModal.verifyThatTabIsHidden('policy');
  await settingsModal.verifyThatTabIsVisible('access_control');
});

test('That it is possible to close the settings modal', async ({ page, testAppName }) => {
  const settingsModal = await setUpAndOpenSettingsModal(page, testAppName);

  await settingsModal.clickOnCloseSettingsModalButton();
  await settingsModal.verifyThatSettingsModalIsNotOpen();
});
