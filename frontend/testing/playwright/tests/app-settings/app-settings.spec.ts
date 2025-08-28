import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import type { SettingsPageTab } from '../../types/SettingsPageTab';
import { SettingsPage } from '../../pages/SettingsPage';
import { PolicyEditor } from '../../components/PolicyEditor';
import { Gitea } from 'testing/playwright/helpers/Gitea';

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

const setUpAndVerifySettingsPage = async (
  page: Page,
  testAppName: string,
  tabToStartAt?: SettingsPageTab,
): Promise<SettingsPage> => {
  const settingsPage = new SettingsPage(page, { app: testAppName });
  await settingsPage.loadSettingsPage();
  await settingsPage.verifySettingsPage();

  if (tabToStartAt && tabToStartAt !== 'about') {
    await settingsPage.navigateToTab(tabToStartAt);
    await settingsPage.verifyThatTabIsVisible(tabToStartAt);
  }
  return settingsPage;
};

test('That it is possible to change tab from "About app" tab to "Setup" tab', async ({
  page,
  testAppName,
}) => {
  const settingsPage: SettingsPage = await setUpAndVerifySettingsPage(page, testAppName);

  await settingsPage.verifyThatTabIsVisible('about');
  await settingsPage.verifyThatTabIsHidden('setup');

  await settingsPage.navigateToTab('setup');

  await settingsPage.verifyThatTabIsHidden('about');
  await settingsPage.verifyThatTabIsVisible('setup');
});

test('That it is possible to change tab to "Policy editor" tab', async ({ page, testAppName }) => {
  const settingsPage: SettingsPage = await setUpAndVerifySettingsPage(page, testAppName, 'setup');

  await settingsPage.verifyThatTabIsVisible('setup');
  await settingsPage.verifyThatTabIsHidden('policy');

  await settingsPage.navigateToTab('policy');

  await settingsPage.verifyThatTabIsHidden('setup');
  await settingsPage.verifyThatTabIsVisible('policy');
});

test('That it is possible to edit security level on "Policy editor" tab, and that changes are saved', async ({
  page,
  testAppName,
}) => {
  const settingsPage: SettingsPage = await setUpAndVerifySettingsPage(page, testAppName, 'policy');
  await settingsPage.verifyThatTabIsVisible('policy');

  const policyEditor = new PolicyEditor(page, { app: testAppName });
  await policyEditor.selectRulesTab();

  const securityLevel2 = 2;
  await policyEditor.verifySelectedSecurityLevel(securityLevel2);

  const securityLevel3 = 3;
  await policyEditor.selectSecurityLevel(securityLevel3);
  await policyEditor.verifySelectedSecurityLevel(securityLevel3);

  // In dev, the API call to save the policy takes some time, and therefore we add functionality to wait for a while to wait for the save to happen
  await settingsPage.waitForXAmountOfMilliseconds(4000);

  await settingsPage.navigateToTab('about');
  await settingsPage.verifyThatTabIsVisible('about');
  await settingsPage.verifyThatTabIsHidden('policy');

  await settingsPage.navigateToTab('policy');

  await policyEditor.verifySelectedSecurityLevel(securityLevel3);
});

test('That it is possible to change tab to "Access control" tab', async ({ page, testAppName }) => {
  const settingsPage: SettingsPage = await setUpAndVerifySettingsPage(page, testAppName, 'policy');

  await settingsPage.verifyThatTabIsVisible('policy');
  await settingsPage.verifyThatTabIsHidden('access_control');

  await settingsPage.navigateToTab('access_control');

  await settingsPage.verifyThatTabIsHidden('policy');
  await settingsPage.verifyThatTabIsVisible('access_control');
});
