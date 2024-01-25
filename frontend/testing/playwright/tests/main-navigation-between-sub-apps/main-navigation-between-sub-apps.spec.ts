import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { OverviewPage } from 'testing/playwright/pages/OverviewPage';
import { UiEditorPage } from 'testing/playwright/pages/UiEditorPage';
import { DataModelPage } from 'testing/playwright/pages/DataModelPage';
import { TextEditorPage } from 'testing/playwright/pages/TextEditorPage';
import { ProcessEditorPage } from 'testing/playwright/pages/ProcessEditorPage';
import { DashboardPage } from 'testing/playwright/pages/DashboardPage';
import { PreviewPage } from 'testing/playwright/pages/PreviewPage';
import { DeployPage } from 'testing/playwright/pages/DeployPage';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the dashboard app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
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

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();

  await uiEditorPage.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the datamodel page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const dataModelPage = new DataModelPage(page, { app: testAppName });

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('datamodel');
  await dataModelPage.verifyDataModelPage();

  await dataModelPage.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the text editor page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const textEditorPage = new TextEditorPage(page, { app: testAppName });

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('texts');
  await textEditorPage.verifyTextEditorPage();

  await textEditorPage.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the process editor page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('process-editor');
  await processEditorPage.verifyProcessEditorPage();

  await processEditorPage.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage();
});

test('That it is possible to navigate from overview to the dashboard page by clicking the Altinn logo', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const dashboardPage = new DashboardPage(page, { app: testAppName });

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('dashboard');
  await dashboardPage.verifyDashboardPage();
});

test('That it is possible to navigate from overview to the preview page and back again', async ({
  page,
  testAppName,
}) => {
  const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const previewPage = new PreviewPage(page, { app: testAppName });
  const uiEditor = new UiEditorPage(page, { app: testAppName });

  await overviewPage.clickOnNavigateToPageInTopMenuHeader('preview');
  await previewPage.verifyPreviewPage();

  await previewPage.clickOnNavigateToPageInTopMenuHeader('preview_back_to_editing');
  await uiEditor.verifyUiEditorPage(null);
});

test('That it is possible to navigate from overview to the deploy page and back again', async ({
  page,
  testAppName,
  request,
  storageState,
}) => {
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState, 'ttd');
  expect(response.ok()).toBeTruthy();

  // const overviewPage = await setupAndVerifyOverviewPage(page, testAppName);
  const dashboardPage = new DashboardPage(page, { app: testAppName });
  const overviewPage = new OverviewPage(page, { app: testAppName });
  const deployPage = new DeployPage(page, { app: testAppName });

  await dashboardPage.loadDashboardPage();
  await dashboardPage.verifyDashboardPage();

  // Change to TTD
  await dashboardPage.clickOnHeaderAvatar();
  await dashboardPage.clickOnOrgApplications();
  await dashboardPage.checkThatTTDApplicationsHeaderIsVisible();
  await dashboardPage.clickOnTestAppEditButton(testAppName);

  const useTtdAsOrg: boolean = true;
  await overviewPage.verifyOverviewPage(useTtdAsOrg);

  // Check Navigation
  await overviewPage.clickOnNavigateToPageInTopMenuHeader('deploy');
  await deployPage.verifyDeployPage(useTtdAsOrg);

  await deployPage.clickOnNavigateToPageInTopMenuHeader('about');
  await overviewPage.verifyOverviewPage(useTtdAsOrg);
});
