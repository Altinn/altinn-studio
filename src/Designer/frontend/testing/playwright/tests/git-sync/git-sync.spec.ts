import { expect } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';
import { LocalChangesModal } from '../../components/LocalChangesModal';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { GiteaPage } from '../../pages/GiteaPage';
import { Gitea } from '../../helpers/Gitea';
import { ComponentType } from '../../enum/ComponentType';

const PAGE_1: string = 'Side1';

// Before the tests starts, we need to create the data model app
test.beforeAll(async ({ testAppName, testAppTemplate, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState, {
    appTemplate: testAppTemplate,
  });
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyUiEditorPage = async (
  page: Page,
  testAppName: string,
  layoutSet: string,
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.clickOnUxEditorButton();
  await uiEditorPage.verifyUiEditorPage(layoutSet, PAGE_1);
  return uiEditorPage;
};

test('That new changes are pushed to gitea and are visible on Gitea after they have been pushed', async ({
  page,
  testAppName,
  defaultLayoutSet,
}) => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName, defaultLayoutSet);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  const newPageName: string = 'Side2';
  await makeChangesOnUiEditorPage(uiEditorPage);
  await uiEditorPage.verifyThatNewPageIsVisible(newPageName);

  await goToGiteaAndNavigateToUiLayoutFiles(header, giteaPage, defaultLayoutSet);
  await giteaPage.verifyThatTheNewPageIsNotPresent(newPageName);

  const nPagesInGitea: number = 5; // 4 because of: Gitea -> App -> ui -> layoutSets -> layouts
  await giteaPage.goBackNPages(nPagesInGitea);
  await uiEditorPage.verifyUiEditorPage(defaultLayoutSet, newPageName);
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();

  await goToGiteaAndNavigateToUiLayoutFiles(header, giteaPage, defaultLayoutSet);
  await giteaPage.verifyThatTheNewPageIsPresent(newPageName);
});

test('That it is possible to delete local changes', async ({
  page,
  testAppName,
  defaultLayoutSet,
}) => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName, defaultLayoutSet);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });

  await makeChangesOnUiEditorPage(uiEditorPage);

  await header.clickOnThreeDotsMenu();
  await header.clickOnLocalChangesButton();

  await localChangesModal.clickOnDeleteLocalChangesButton();
  await localChangesModal.writeAppNameInConfirmTextfield(testAppName);
  await localChangesModal.clickOnDeleteMyChangesButton();
  await localChangesModal.verifyThatDeleteLocalChangesSuccessPageReload();
});

test('That it is possible to download repo zip', async ({
  page,
  testAppName,
  defaultLayoutSet,
}) => {
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });
  await makeUiEditorChangesAndOpenLocalChangesModal(page, testAppName, defaultLayoutSet);

  const downloadPromise: Promise<Download> = localChangesModal.getDownloadPromise();
  await localChangesModal.clickOnDownloadRepoZipButton();
  await downloadPromise; // Verify that the download promise resolves
});

test('That it is possible to download local changes zip', async ({
  page,
  testAppName,
  defaultLayoutSet,
}) => {
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });
  await makeUiEditorChangesAndOpenLocalChangesModal(page, testAppName, defaultLayoutSet);

  const downloadPromise: Promise<Download> = localChangesModal.getDownloadPromise();
  await localChangesModal.clickOnDownloadOnlyLocalChangesZipButton();
  await downloadPromise; // Verify that the download promise resolves
});

// Below are helper functions for "duplicate" code where the process is the same
const makeChangesOnUiEditorPage = async (uiEditorPage: UiEditorPage) => {
  await uiEditorPage.clickOnAddNewPage();
  await uiEditorPage.waitForDraggableToolbarItemToBeVisible(ComponentType.NavigationButtons);
};

const goToGiteaAndNavigateToUiLayoutFiles = async (
  header: AppDevelopmentHeader,
  giteaPage: GiteaPage,
  layoutSet: string,
) => {
  await header.clickOnThreeDotsMenu();
  const newTab = await header.clickOnGoToGiteaRepository();
  await giteaPage.useNewTab(newTab);
  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutSetsFolder(layoutSet);
  await giteaPage.clickOnLayoutsFilesFolder();
};

const makeUiEditorChangesAndOpenLocalChangesModal = async (
  page: Page,
  testAppName: string,
  layoutSet: string,
): Promise<AppDevelopmentHeader> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName, layoutSet);
  const header = new AppDevelopmentHeader(page, { app: testAppName });

  await makeChangesOnUiEditorPage(uiEditorPage);

  await header.clickOnThreeDotsMenu();
  await header.clickOnLocalChangesButton();
  return header;
};
