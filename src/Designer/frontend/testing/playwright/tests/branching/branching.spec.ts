import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { BranchDropdown } from '../../components/BranchDropdown';

const DEFAULT_BRANCH: string = 'master';
const FEATURE_BRANCH: string = 'playwright-branch';
const LAYOUT_SET: string = 'form';
const FIRST_ADDED_PAGE: string = 'Side2';

test.beforeAll(async ({ testAppName, request, storageState }) => {
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

test('That a new branch can be created and becomes the current branch', async ({
  page,
  testAppName,
}) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });

  await branchDropdown.verifyCurrentBranch(DEFAULT_BRANCH);
  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnNewBranchButton();
  await branchDropdown.writeNewBranchName(FEATURE_BRANCH);
  await branchDropdown.clickOnCreateBranchButton();

  await branchDropdown.verifyCurrentBranch(FEATURE_BRANCH);
});

test('That it is possible to switch between branches', async ({ page, testAppName }) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });

  await branchDropdown.verifyCurrentBranch(FEATURE_BRANCH);
  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnBranchInList(DEFAULT_BRANCH);

  await branchDropdown.verifyCurrentBranch(DEFAULT_BRANCH);
});

test('That creating a new branch with uncommitted changes triggers dialog', async ({
  page,
  testAppName,
}) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });
  await addUncommittedChange(page, testAppName);

  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnNewBranchButton();
  await branchDropdown.writeNewBranchName('alert-create-branch');
  await branchDropdown.clickOnCreateBranchButton();

  await branchDropdown.verifyUncommittedChangesAlertIsVisible();
  await branchDropdown.clickOnCancelUncommittedChangesButton();
});

test('That switching branch with uncommitted changes triggers dialog', async ({
  page,
  testAppName,
}) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });

  await branchDropdown.verifyCurrentBranch(DEFAULT_BRANCH);
  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnBranchInList(FEATURE_BRANCH);

  await branchDropdown.verifyUncommittedChangesAlertIsVisible();
  await branchDropdown.clickOnCancelUncommittedChangesButton();
});

test('That local changes can be discarded from the uncommitted changes dialog', async ({
  page,
  testAppName,
}) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });

  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnBranchInList(FEATURE_BRANCH);
  await branchDropdown.verifyUncommittedChangesAlertIsVisible();
  await branchDropdown.clickOnDiscardAndSwitchButton();

  // A successful checkout only happens with a clean working tree, so this confirms the discard.
  await branchDropdown.verifyCurrentBranch(FEATURE_BRANCH);
});

test('That a branch can be deleted', async ({ page, testAppName }) => {
  await goToUiEditor(page, testAppName);
  const branchDropdown = new BranchDropdown(page, { app: testAppName });

  await branchDropdown.verifyCurrentBranch(FEATURE_BRANCH);
  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.clickOnDeleteBranchButton();
  await branchDropdown.writeBranchNameToConfirmDeletion(FEATURE_BRANCH);
  await branchDropdown.clickOnConfirmDeleteButton();

  await branchDropdown.verifyCurrentBranch(DEFAULT_BRANCH);
  await branchDropdown.clickOnBranchDropdownTrigger();
  await branchDropdown.verifyBranchIsNotInList(FEATURE_BRANCH);
});

const goToUiEditor = async (page: Page, testAppName: string): Promise<void> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.clickOnUxEditorButton();
  await uiEditorPage.verifyUiEditorPage(LAYOUT_SET);
};

const addUncommittedChange = async (page: Page, testAppName: string): Promise<void> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.clickOnAddNewPage();
  await expect(page.getByRole('button', { name: FIRST_ADDED_PAGE, exact: true })).toBeVisible();
};
