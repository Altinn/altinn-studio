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

  await orgLibraryPage.codeLists.clickOnCreateNewCodelistButton();
  await orgLibraryPage.codeLists.verifyNewCodelistModalIsOpen();
  await orgLibraryPage.codeLists.writeCodelistTitle(CODELIST_TITLE_MANUALLY);
  await orgLibraryPage.codeLists.clickOnAddAlternativeButton();

  await orgLibraryPage.codeLists.verifyNewItemValueFieldIsVisible(
    EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST,
  );
  const firstRowValue: string = 'First value';
  await orgLibraryPage.codeLists.writeCodelistValue(
    EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST,
    firstRowValue,
  );
  const firstRowLabel: string = 'First label';
  await orgLibraryPage.codeLists.writeCodelistLabel(
    EXPECTED_NUMBER_OF_ITEMS_IN_MANUALLY_CREATED_CODELIST,
    firstRowLabel,
  );

  await orgLibraryPage.codeLists.clickOnSaveCodelistButton();
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_MANUALLY);
});

test('that it is possible to add a new row to an existing codelist and modify the fields in the row', async ({
  page,
  testAppName,
}) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_MANUALLY);
  await orgLibraryPage.codeLists.clickOnCodeListAccordion(CODELIST_TITLE_MANUALLY);

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

  await orgLibraryPage.codeLists.clickOnCodeListAccordion(CODELIST_TITLE_UPLOADED);
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE_UPLOADED);
  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST,
    CODELIST_TITLE_UPLOADED,
  );

  const firstRow: number = 1;
  const firstRowValue: string = 'test1';
  const secondRowValue: string = 'test2';
  await orgLibraryPage.codeLists.verifyValueInRow(firstRow, firstRowValue);
  await orgLibraryPage.codeLists.clickOnDeleteRowButton(firstRow);

  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST_AFTER_DELETE,
    CODELIST_TITLE_UPLOADED,
  );
  await orgLibraryPage.codeLists.verifyValueInRow(firstRow, secondRowValue);
});

test('that it is possible to search for and delete the new codelists', async ({
  page,
  testAppName,
}) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await searchForAndOpenCodeList(orgLibraryPage, CODELIST_TITLE_MANUALLY);
  await deleteAndVerifyDeletionOfCodeList(
    orgLibraryPage,
    CODELIST_TITLE_MANUALLY,
    EXPECTED_NUMBER_OF_ROWS_IN_MANUALLY_CREATED_CODELIST_AFTER_ADDING_ROW,
  );

  await searchForAndOpenCodeList(orgLibraryPage, CODELIST_TITLE_UPLOADED);
  await deleteAndVerifyDeletionOfCodeList(
    orgLibraryPage,
    CODELIST_TITLE_UPLOADED,
    EXPECTED_NUMBER_OF_ROWS_IN_UPLOADED_CODELIST_AFTER_DELETE,
  );
});

const searchForAndOpenCodeList = async (
  orgLibraryPage: OrgLibraryPage,
  codelistTitle: string,
): Promise<void> => {
  await orgLibraryPage.codeLists.typeInSearchBox(codelistTitle);
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(codelistTitle);
  await orgLibraryPage.codeLists.clickOnCodeListAccordion(codelistTitle);
};

const deleteAndVerifyDeletionOfCodeList = async (
  orgLibraryPage: OrgLibraryPage,
  codelistTitle: string,
  expectedNumberOfRowsInCodeList: number,
): Promise<void> => {
  await orgLibraryPage.codeLists.verifyNumberOfItemsInTheCodelist(
    expectedNumberOfRowsInCodeList,
    codelistTitle,
  );
  await orgLibraryPage.codeLists.listenToAndWaitForConfirmDeleteCodeList(codelistTitle);
  await orgLibraryPage.codeLists.clickOnDeleteCodelistButton();
  await orgLibraryPage.codeLists.verifyThatCodeListIsNotVisible(codelistTitle);
};
