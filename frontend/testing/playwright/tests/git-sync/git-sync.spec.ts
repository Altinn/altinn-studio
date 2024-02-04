import { expect } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Header } from '../../components/Header';
import { LocalChangesModal } from '../../components/LocalChangesModal';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { GiteaPage } from '../../pages/GiteaPage';
import { Gitea } from '../../helpers/Gitea';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the data model app
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

const setupAndVerifyUiEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

test('That new changes are pushed to gitea and are visible on Gitea after they have been pushed', async ({
  page,
  testAppName,
}) => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  const newPageName: string = 'Side2';
  await makeChangesOnUiEditorPage(uiEditorPage, newPageName);

  await goToGiteaAndNavigateToUiLayoutFiles(header, giteaPage);
  await giteaPage.verifyThatTheNewPageIsNotPresent(newPageName);

  const nPagesInGitea: number = 4; // 4 because of: Gitea -> App -> ui -> layouts
  await giteaPage.goBackNPages(nPagesInGitea);
  await uiEditorPage.verifyUiEditorPage(newPageName);
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();

  await goToGiteaAndNavigateToUiLayoutFiles(header, giteaPage);
  await giteaPage.verifyThatTheNewPageIsPresent(newPageName);
});

test('That it is possible to delete local changes', async ({ page, testAppName }) => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });

  const newPageName: string = 'Side2';
  await makeChangesOnUiEditorPage(uiEditorPage, newPageName);

  await header.clickOnThreeDotsMenu();
  await header.clickOnLocalChangesButton();

  await localChangesModal.clickOnDeleteLocalChangesButton();
  await localChangesModal.writeAppNameInConfirmTextfield(testAppName);
  await localChangesModal.clickOnDeleteMyChangesButton();
  await localChangesModal.verifyThatDeleteLocalChangesSuccessMessageIsVisible();
});

test('That it is possible to download repo zip', async ({ page, testAppName }) => {
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });
  await makeUiEditorChangesAndOpenLocalChangesModal(page, testAppName);

  const downloadPromise: Promise<Download> = localChangesModal.getDownloadPromise();
  await localChangesModal.clickOnDownloadRepoZipButton();
  await downloadPromise; // Verify that the download promise resolves
});

test('That it is possible to download local changes zip', async ({ page, testAppName }) => {
  const localChangesModal = new LocalChangesModal(page, { app: testAppName });
  await makeUiEditorChangesAndOpenLocalChangesModal(page, testAppName);

  const downloadPromise: Promise<Download> = localChangesModal.getDownloadPromise();
  await localChangesModal.clickOnDownloadOnlyLocalChangesZipButton();
  await downloadPromise; // Verify that the download promise resolves
});

// Below are helper functions for "duplicate" code where the process is the same
const makeChangesOnUiEditorPage = async (uiEditorPage: UiEditorPage, newPageName: string) => {
  await uiEditorPage.verifyThatNewPageIsHidden(newPageName);
  await uiEditorPage.clickOnAddNewPage();
  await uiEditorPage.verifyThatNewPageIsVisible(newPageName);
};

const goToGiteaAndNavigateToUiLayoutFiles = async (header: Header, giteaPage: GiteaPage) => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutsFilesButton();
};

const makeUiEditorChangesAndOpenLocalChangesModal = async (
  page: Page,
  testAppName: string,
): Promise<Header> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });

  const newPageName: string = 'Side2';
  await makeChangesOnUiEditorPage(uiEditorPage, newPageName);

  await header.clickOnThreeDotsMenu();
  await header.clickOnLocalChangesButton();
  return header;
};
