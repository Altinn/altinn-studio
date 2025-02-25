import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import { OrgLibraryPage } from '../../pages/OrgLibraryPage';

const TEST_ORG: string = 'ttd';
const CODELIST_TITLE: string = 'Test_codelist';

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
  await orgLibraryPage.codeLists.writeCodelistTitle(CODELIST_TITLE);
  await orgLibraryPage.codeLists.clickOnAddAlternativeButton();
  const firstRow: number = 1;
  await orgLibraryPage.codeLists.verifyAlternativeRowIsVisible(firstRow);
  const firstRowValue: string = 'First value';
  await orgLibraryPage.codeLists.writeCodelistValue(firstRow, firstRowValue);
  const firstRowLabel: string = 'First label';
  await orgLibraryPage.codeLists.writeCodelistLabel(firstRow, firstRowLabel);

  await orgLibraryPage.codeLists.clickOnSaveCodelistButton();
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE);
});

test('that it is possible to search for and delete the new codelist', async ({
  page,
  testAppName,
}) => {
  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await orgLibraryPage.codeLists.typeInSearchBox(CODELIST_TITLE);
  await orgLibraryPage.codeLists.verifyThatCodeListIsVisible(CODELIST_TITLE);
  await orgLibraryPage.codeLists.clickOnCodeListAccordion(CODELIST_TITLE);

  const numberOfRowsInCodelist: number = 1;
  await orgLibraryPage.codeLists.verifyNumberOfRowsInTheCodelist(numberOfRowsInCodelist);

  await orgLibraryPage.codeLists.listeToAndWaitForConfirmDeleteCodeList(CODELIST_TITLE);
  await orgLibraryPage.codeLists.clickOnDeleteCodelistButton();

  await orgLibraryPage.codeLists.verifyThatCodeListIsNotVisible(CODELIST_TITLE);
});
