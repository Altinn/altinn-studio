import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { OverviewPage } from '../../pages/OverviewPage';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { DataModelPage } from '../../pages/DataModelPage';
import { TextEditorPage } from '../../pages/TextEditorPage';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { PreviewPage } from '../../pages/PreviewPage';
import { DeployPage } from '../../pages/DeployPage';
import { Header } from '../../components/Header';
import { Gitea } from '../../helpers/Gitea';

// Before the tests starts, we need to create the dashboard app
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

  const responseTTD = await request.delete(
    gitea.getDeleteAppEndpoint({ org: 'ttd', app: testAppName }),
  );
  expect(responseTTD.ok()).toBeTruthy();
});

const setupAndVerifyOverviewPage = async (
  page: Page,
  testAppName: string,
): Promise<OverviewPage> => {
  const overviewPage = new OverviewPage(page, { app: testAppName });
  await overviewPage.loadOverviewPage();
  await overviewPage.verifyOverviewPage();
  return overviewPage;
};

test('That it is possible to navigate from overview to the app builder page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();

  await header.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the datamodel page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('datamodel');
  await dataModelPage.verifyDataModelPage();

  await header.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the text editor page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const textEditorPage = new TextEditorPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('texts');
  await textEditorPage.verifyTextEditorPage();

  await header.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the process editor page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('process-editor');
  await processEditorPage.verifyProcessEditorPage();

  await header.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the dashboard page by clicking the Altinn logo', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyOverviewPage(page, testAppName);
  const dashboardPage = new DashboardPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('dashboard');
  await dashboardPage.verifyDashboardPage();
});

test('That it is possible to navigate from overview to the preview page and back again', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyOverviewPage(page, testAppName);
  const previewPage = new PreviewPage(page, { app: testAppName });
  const uiEditor = new UiEditorPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('preview');
  await previewPage.verifyPreviewPage();

  await header.clickOnNavigateToPageInTopMenuHeader('preview_back_to_editing');
  await uiEditor.verifyUiEditorPage(null);
});

test('That it is possible to navigate from overview to the deploy page and back again', async ({
  page,
  testAppName,
  request,
  storageState,
}) => {
  const testDepartmentOrg: string = 'ttd';

  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(
    request,
    storageState as StorageState,
    testDepartmentOrg,
  );
  expect(response.ok()).toBeTruthy();

  const dashboardPage = new DashboardPage(page, { app: testAppName });
  const overviewPage = new OverviewPage(page, { app: testAppName });
  const deployPage = new DeployPage(page, { app: testAppName });
  const header = new Header(page, { app: testAppName });

  await dashboardPage.loadDashboardPage();
  await dashboardPage.verifyDashboardPage();

  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnOrgApplications();
  dashboardPage.updateOrgNameEnv(testDepartmentOrg);
  await dashboardPage.checkThatTTDApplicationsHeaderIsVisible();

  expect(dashboardPage.org).toEqual('ttd');
  await dashboardPage.clickOnTestAppEditButton(testAppName);

  // As we have changed env.org to 'ttd', we need to update the org of the new classes to make sure it works.
  overviewPage.updateOrgNameEnv(testDepartmentOrg);
  deployPage.updateOrgNameEnv(testDepartmentOrg);
  header.updateOrgNameEnv(testDepartmentOrg);

  await overviewPage.verifyOverviewPage();

  // Check Navigation
  await header.clickOnNavigateToPageInTopMenuHeader('deploy');
  await deployPage.verifyDeployPage();

  await header.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});
