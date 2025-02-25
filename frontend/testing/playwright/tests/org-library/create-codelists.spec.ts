import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import { OrgLibraryPage } from '../../pages/OrgLibraryPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { OverviewPage } from '../../pages/OverviewPage';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';

const TEST_ORG: string = 'ttd';

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
  await navigateToAppAndPullLatestVersionAndNavigateBack(page);

  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  await orgLibraryPage.codeLists.clickOnCreateNewCodelistButton();
  await orgLibraryPage.codeLists.verifyNewCodelistModalIsOpen();
  const codelistTitle: string = 'Test_codelist';
  await orgLibraryPage.codeLists.writeCodelistTitle(codelistTitle);
  await orgLibraryPage.codeLists.clickOnAddAlternativeButton();
  const firstRow: number = 1;
  await orgLibraryPage.codeLists.verifyAlternativeRowIsVisible(firstRow);
  const firstRowValue: string = 'First value';
  await orgLibraryPage.codeLists.writeCodelistValue(firstRow, firstRowValue);
  const firstRowLabel: string = 'First label';
  await orgLibraryPage.codeLists.writeCodelistLabel(firstRow, firstRowLabel);

  await orgLibraryPage.codeLists.clickOnSaveCodelistButton();
  await orgLibraryPage.codeLists.verifyThatNewCodeListIsVisible(codelistTitle);
});

test('that it is possible to upload a new codelist', async ({ page, testAppName }) => {
  await navigateToAppAndPullLatestVersionAndNavigateBack(page);

  const orgLibraryPage: OrgLibraryPage = await setupAndVerifyCodeListPage(page, testAppName);

  // TODO
  // Click upload
  // Verify correct number of rows

  const codelistTitle: string = 'Test codelist';
  await orgLibraryPage.codeLists.verifyThatNewCodeListIsVisible(codelistTitle);
});

// TODO - Delete this function once https://github.com/Altinn/altinn-studio/pull/14793 is merged.
const navigateToAppAndPullLatestVersionAndNavigateBack = async (page: Page) => {
  const repoName: string = 'ttd-content';

  const dashboardPage: DashboardPage = new DashboardPage(page, { app: repoName, org: TEST_ORG });
  const overviewPage: OverviewPage = new OverviewPage(page, { app: repoName, org: TEST_ORG });
  const appDevelopmentHeader = new AppDevelopmentHeader(page, { app: repoName, org: TEST_ORG });

  await dashboardPage.loadDashboardPageAsOrg();
  await dashboardPage.verifyDashboardPageAsOrg();

  await dashboardPage.checkThatAppIsVisible(repoName);
  await dashboardPage.clickOnTestAppEditButton(repoName);

  const useTtdAsOrg: boolean = true;
  await overviewPage.verifyOverviewPage(useTtdAsOrg);
  await appDevelopmentHeader.clickOnPullFromGitea();
  await appDevelopmentHeader.waitForFetchingToComplete();
  await appDevelopmentHeader.clickOnNavigateToDashboard();
};
