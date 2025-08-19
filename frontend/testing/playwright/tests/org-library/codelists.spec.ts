import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import { OrgLibraryPage } from '../../pages/OrgLibraryPage';

const TEST_ORG: string = 'ttd';
const CODELIST_TITLE_MANUALLY: string = 'Test_codelist';
const CODELIST_TITLE_UPLOADED: string = 'testCodelist';

const EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST: number = 1;
const EXPECTED_NUMBER_OF_ROWS_IN_MANUALLY_CREATED_CODELIST_AFTER_ADDING_ROW: number =
  EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST + 1;
const EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST: number = 3;
const EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST_AFTER_DELETE: number =
  EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST - 1;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ testAppName, request, storageState }) => {
  const designerApi = new DesignerApi({ app: testAppName, org: TEST_ORG });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(
    gitea.getDeleteAppEndpoint({ app: testAppName, org: TEST_ORG }),
  );
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyCodeListPage = async (
  page: Page,
  testAppName: string,
): Promise<OrgLibraryPage> => {
  const orgLibraryPage = new OrgLibraryPage(page, { app: testAppName, org: TEST_ORG });
  await orgLibraryPage.loadOrgLibraryPage();
  await orgLibraryPage.verifyOrgLibraryPage();
  await orgLibraryPage.waitForPageHeaderToBeVisible();
  await orgLibraryPage.clickOnNavigateToCodeListPage();
  await orgLibraryPage.codeLists.waitForCodeListPageToLoad();

  return orgLibraryPage;
};

test('that it is possible to create a new codelist', async ({ page, testAppName }) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  const codeListTitleAlreadyExists: boolean =
    await orgLibraryPage.codeLists.codeListTitleExists(CODELIST_TITLE_MANUALLY);

  // If for some reason the code list was not deleted in the tests in staging, we delete it before testing the creation.
  // This situation might happen if a test is cancelled right after the creation of the code list.
  if (codeListTitleAlreadyExists) {
    await orgLibraryPage.codeLists.clickOnCodeListDetails(CODELIST_TITLE_MANUALLY);
    await deleteAndVerifyDeletionOfOpenedCodeList(orgLibraryPage, CODELIST_TITLE_MANUALLY);
  }

  await orgLibraryPage.codeLists.clickOnAddNewCodeListDropdown();
  await orgLibraryPage.codeLists.clickOnCreateNewCodelistButton();
  await orgLibraryPage.codeLists.verifyNewCodelistModalIsOpen();
  await orgLibraryPage.codeLists.writeCodelistTitle(CODELIST_TITLE_MANUALLY);

  await orgLibraryPage.codeLists.clickOnSaveCodelistButton();
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_MANUALLY);
});

// Todo: Remove "skip" and adjust this test when creation of text resources is implemented: https://github.com/Altinn/altinn-studio/issues/15048
test.skip('that it is possible to add a new row to an existing codelist and modify the fields in the row', async ({
  page,
  testAppName,
}) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_MANUALLY);
  await orgLibraryPage.codeLists.clickOnCodeListDetails(CODELIST_TITLE_MANUALLY);

  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST,
    CODELIST_TITLE_MANUALLY,
  );

  await orgLibraryPage.codeLists.clickOnAddItemButton();
  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_MANUALLY_CREATED_CODELIST_AFTER_ADDING_ROW,
    CODELIST_TITLE_MANUALLY,
  );

  const lastlyAddedItemNumber: number =
    EXPECTED_NUMBER_OF_ROWS_IN_MANUALLY_CREATED_CODELIST_AFTER_ADDING_ROW;
  await orgLibraryPage.codeLists.verifyEmptyValueTextfield(lastlyAddedItemNumber);
  await orgLibraryPage.codeLists.verifyEmptyLabelTextfield(lastlyAddedItemNumber);

  const value: string = 'value';
  await orgLibraryPage.codeLists.writeCodelistValue(lastlyAddedItemNumber, value);
  await orgLibraryPage.codeLists.verifyValueTextfield(lastlyAddedItemNumber, value);

  const label: string = 'label';
  await orgLibraryPage.codeLists.writeCodelistLabel(lastlyAddedItemNumber, label);
  await orgLibraryPage.codeLists.verifyLabelTextfield(lastlyAddedItemNumber, label);
});

test('that it is possible to upload a new codelist', async ({ page, testAppName }) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  const codeListTitleAlreadyExists: boolean =
    await orgLibraryPage.codeLists.codeListTitleExists(CODELIST_TITLE_UPLOADED);

  // If for some reason the code list was not deleted in the tests in staging, we delete it before testing the creation.
  // This situation might happen if a test is cancelled right after the creation of the code list.
  if (codeListTitleAlreadyExists) {
    await orgLibraryPage.codeLists.clickOnCodeListDetails(CODELIST_TITLE_UPLOADED);
    await deleteAndVerifyDeletionOfOpenedCodeList(orgLibraryPage, CODELIST_TITLE_UPLOADED);
  }

  await orgLibraryPage.codeLists.clickOnAddNewCodeListDropdown();

  const codelistFileName: string = `${CODELIST_TITLE_UPLOADED}.json`;
  await orgLibraryPage.codeLists.clickOnUploadButtonAndSelectFileToUpload(codelistFileName);
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_UPLOADED);
  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST,
    CODELIST_TITLE_UPLOADED,
  );
});

test('that it is possible to delete a row in an uploaded codelist', async ({
  page,
  testAppName,
}) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await orgLibraryPage.codeLists.clickOnCodeListDetails(CODELIST_TITLE_UPLOADED);
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_UPLOADED);
  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST,
    CODELIST_TITLE_UPLOADED,
  );

  const itemNumberOne: number = 1;
  const firstItemValue: string = 'test1';
  const secondItemValue: string = 'test2';
  await orgLibraryPage.codeLists.verifyValueTextfield(itemNumberOne, firstItemValue);
  await orgLibraryPage.codeLists.clickOnDeleteItemButton(itemNumberOne);

  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST_AFTER_DELETE,
    CODELIST_TITLE_UPLOADED,
  );
  await orgLibraryPage.codeLists.verifyValueTextfield(itemNumberOne, secondItemValue);
});

test('that it is possible to delete the new codelists', async ({ page, testAppName }) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await openCodeList(orgLibraryPage, CODELIST_TITLE_MANUALLY);
  await deleteAndVerifyDeletionOfOpenedCodeList(orgLibraryPage, CODELIST_TITLE_MANUALLY);

  await openCodeList(orgLibraryPage, CODELIST_TITLE_UPLOADED);
  await deleteAndVerifyDeletionOfOpenedCodeList(orgLibraryPage, CODELIST_TITLE_UPLOADED);
});

const openCodeList = async (
  orgLibraryPage: OrgLibraryPage,
  codelistTitle: string,
): Promise<void> => {
  await orgLibraryPage.codeLists.clickOnCodeListDetails(codelistTitle);
};

const deleteAndVerifyDeletionOfOpenedCodeList = async (
  orgLibraryPage: OrgLibraryPage,
  codelistTitle: string,
): Promise<void> => {
  await orgLibraryPage.codeLists.listenToAndWaitForConfirmDeleteCodeList(codelistTitle);
  await orgLibraryPage.codeLists.clickOnDeleteCodelistButton();
  await orgLibraryPage.codeLists.verifyThatCodeListIsNotVisible(codelistTitle);
};
