import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import { OrgLibraryPage } from '../../pages/OrgLibraryPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { DashboardHeader } from '../../components/DashboardHeader';

const TEST_ORG: string = 'ttd';
const ORG_LIBRARY_FEATURE_FLAG: string = '?featureFlags=orgLibrary&persistFeatureFlag=true';

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

test('that it is possible to navigate from dashboard page to library page and back again', async ({
  page,
  testAppName,
}) => {
  const dashboardPage = new DashboardPage(page, { app: testAppName, org: TEST_ORG });
  const dashboardHeader: DashboardHeader = new DashboardHeader(page, {
    app: testAppName,
    org: TEST_ORG,
  });
  const orgLibraryPage = new OrgLibraryPage(page, { app: testAppName, org: TEST_ORG });

  await dashboardPage.loadDashboardPageAsOrg(ORG_LIBRARY_FEATURE_FLAG);
  await dashboardPage.verifyDashboardPageAsOrg(ORG_LIBRARY_FEATURE_FLAG);
  await dashboardHeader.clickOnNavigateToPageInTopMenuHeader('library');
  await orgLibraryPage.verifyOrgLibraryPage();
  await orgLibraryPage.waitForPageHeaderToBeVisible();

  await dashboardHeader.clickOnNavigateToPageInTopMenuHeader('dashboard');
  await dashboardPage.verifyDashboardPageAsOrg();
});
