import { test } from '../../extenders/testExtend';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { BpmnJSQuery } from '@studio/testing/playwright/helpers/BpmnJSQuery';
import { expect, type Page } from '@playwright/test';
import { AppDevelopmentHeader } from '@studio/testing/playwright/components/AppDevelopmentHeader';
import { DesignerApi } from '@studio/testing/playwright/helpers/DesignerApi';
import type { StorageState } from '@studio/testing/playwright/types/StorageState';
import { Gitea } from '@studio/testing/playwright/helpers/Gitea';
import { GiteaPage } from '@studio/testing/playwright/pages/GiteaPage';

test.describe.configure({ mode: 'serial' });

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

test.skip('should be possible to add predefined actions to task', async ({
  page,
  testAppName,
}): Promise<void> => {
  const giteaPage = new GiteaPage(page, { app: testAppName });
  const processEditorPage = await setupProcessEditorActionConfigPanel(page, testAppName);

  await processEditorPage.actionsConfig.clickAddActionsButton();
  await processEditorPage.actionsConfig.choosePredefinedAction('write');

  await commitAndPushToGitea(page, testAppName);
  await goToProcessFileInGitea(page, testAppName);
  await giteaPage.verifyThatActionIsVisible('write');
});

test.skip('should be possible to add custom actions to task and set them as serverAction', async ({
  page,
  testAppName,
}): Promise<void> => {
  const giteaPage = new GiteaPage(page, { app: testAppName });
  const processEditorPage = await setupProcessEditorActionConfigPanel(page, testAppName);
  await processEditorPage.actionsConfig.clickAddActionsButton();
  await processEditorPage.actionsConfig.clickOnCustomActionTab();
  await processEditorPage.actionsConfig.writeCustomAction('myCustomAction');
  await processEditorPage.actionsConfig.makeCustomActionToServerAction();

  await commitAndPushToGitea(page, testAppName);
  await goToProcessFileInGitea(page, testAppName);
  await giteaPage.verifyThatActionIsCustomServerAction('myCustomAction');
});

test.skip('should be possible to remove action from task', async ({
  page,
  testAppName,
}): Promise<void> => {
  const giteaPage = new GiteaPage(page, { app: testAppName });
  const processEditorPage = await setupProcessEditorActionConfigPanel(page, testAppName);

  await processEditorPage.actionsConfig.editAction();

  await processEditorPage.actionsConfig.deleteAction('write');
  await commitAndPushToGitea(page, testAppName);

  await goToProcessFileInGitea(page, testAppName);
  await giteaPage.verifyThatActionIsHidden('write');
});

// Methods below is helpers to make the test shorter and more readable.
const setupProcessEditorActionConfigPanel = async (
  page: Page,
  testAppName: string,
): Promise<ProcessEditorPage> => {
  const bpmnJSQuery = new BpmnJSQuery(page);
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  await processEditorPage.loadProcessEditorPage();
  await processEditorPage.verifyProcessEditorPage();

  const task = await bpmnJSQuery.getTaskByIdAndType('Task_1', 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(task);

  await processEditorPage.waitForInitialTaskHeaderToBeVisible();
  await processEditorPage.actionsConfig.clickOnActionsAccordion();
  await processEditorPage.actionsConfig.waitForAddActionsButtonToBeVisible();

  return processEditorPage;
};

const commitAndPushToGitea = async (page: Page, testAppName: string): Promise<void> => {
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();
};

const goToProcessFileInGitea = async (page: Page, testAppName: string) => {
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnProcessFilesButton();
  await giteaPage.clickOnProcessBpmnFile();
};
