import { test } from '../../extenders/testExtend';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { BpmnJSQuery } from '../../helpers/BpmnJSQuery';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';
import { DataModelPage } from '../../pages/DataModelPage';
import { GiteaPage } from '../../pages/GiteaPage';
import { type BpmnTaskType } from '../../types/BpmnTaskType';

// Variables used in the tests
let randomGeneratedId: string = null;
const dataTask: BpmnTaskType = 'data';
const initialId: string = 'Task_1';
const newDataModel: string = 'testDataModel';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
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

const setupAndVerifyProcessEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<ProcessEditorPage> => {
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  await processEditorPage.loadProcessEditorPage();
  await processEditorPage.verifyProcessEditorPage();
  return processEditorPage;
};

test('that the user can drag a new task in to the data model, and assign a data model to it', async ({
  page,
  testAppName,
}) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });

  const svgSelector = await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg');
  const dataTask: BpmnTaskType = 'data';
  await processEditorPage.dragTaskInToBpmnEditor(dataTask, svgSelector);
  await processEditorPage.skipRecommendedTask();
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(dataTask);
  randomGeneratedId = await processEditorPage.getTaskIdFromOpenNewlyAddedTask();

  await processEditorPage.dataModelConfig.clickOnDesignAccordion();
  await processEditorPage.dataModelConfig.waitForAddDataModelButtonWithoutValueToBeVisible();
  await processEditorPage.dataModelConfig.clickOnAddButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();
  await processEditorPage.dataModelConfig.clickOnCombobox();
  await processEditorPage.dataModelConfig.verifyThatThereAreNoDataModelsAvailable();
  await processEditorPage.pressEscapeOnKeyboard();

  await navigateToDataModelAndCreateNewDataModel(
    dataModelPage,
    processEditorPage,
    header,
    newDataModel,
  );
  const newTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(randomGeneratedId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(newTaskSelector);

  await processEditorPage.dataModelConfig.clickOnDesignAccordion();
  await processEditorPage.dataModelConfig.waitForAddDataModelButtonWithoutValueToBeVisible();
  await processEditorPage.dataModelConfig.clickOnAddButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();
  await processEditorPage.dataModelConfig.clickOnCombobox();
  await processEditorPage.dataModelConfig.chooseOption(newDataModel);
  await processEditorPage.dataModelConfig.waitForDataModelButtonToBeVisibleWithValue(newDataModel);
  await processEditorPage.dataModelConfig.verifyDataModelButtonTextIsSelectedDataModel(
    newDataModel,
  );
});

test('that the user can add a sequence arrow between two tasks', async ({ page, testAppName }) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);

  const newlyAddedTask: string = await bpmnJSQuery.getTaskByIdAndType(randomGeneratedId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(newlyAddedTask);
  // await processEditorPage.clickOnNewlyAddedElement(`Altinn ${dataTask} task`);
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(dataTask);

  await processEditorPage.clickOnConnectionArrow();

  const initialTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(initialId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskSelector);
  await page.waitForTimeout(500); // avoid double click, causing name editor to open
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  await new Promise((resolve) => setTimeout(() => resolve({}), 4000));
});

test('that the changes made to the bpmn process are uploaded to Gitea', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyProcessEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });
  await commitAndPushToGitea(header);

  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsVisible(randomGeneratedId, dataTask);

  await giteaPage.verifySequenceFlowDirection(randomGeneratedId, initialId);
  await giteaPage.clickOnApplicationMetadataFile();
  await giteaPage.verifyIdInDataModel(randomGeneratedId, newDataModel);
});

// --------------------- Helper Functions ---------------------
const goToGiteaAndNavigateToProcessBpmnFile = async (
  header: AppDevelopmentHeader,
  giteaPage: GiteaPage,
): Promise<void> => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnProcessFilesButton();
  await giteaPage.clickOnProcessBpmnFile();
};

const commitAndPushToGitea = async (header: AppDevelopmentHeader): Promise<void> => {
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();
};

const navigateToDataModelAndCreateNewDataModel = async (
  dataModelPage: DataModelPage,
  processEditorPage: ProcessEditorPage,
  header: AppDevelopmentHeader,
  newDataModelName: string,
): Promise<void> => {
  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('data_model');
  await dataModelPage.verifyDataModelPage();
  await dataModelPage.clickOnCreateNewDataModelButton();
  await dataModelPage.typeDataModelName(newDataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.waitForDataModelToAppear(newDataModelName);
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();
  await dataModelPage.waitForSuccessAlertToDisappear();

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('process_editor');
  await processEditorPage.verifyProcessEditorPage();
};
