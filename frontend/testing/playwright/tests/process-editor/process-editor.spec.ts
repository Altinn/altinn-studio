import { test } from '../../extenders/testExtend';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { BpmnJSQuery } from '../../helpers/BpmnJSQuery';
import { Header } from '../../components/Header';
import { DataModelPage } from '../../pages/DataModelPage';
import { GiteaPage } from '../../pages/GiteaPage';
import { type BpmnTaskType } from '../../types/BpmnTaskType';

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

test('That it is possible to click a task in the process editor, and delete the data model id, and add a new one', async ({
  page,
  testAppName,
}): Promise<void> => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskByIdAndType(
    'Task_1',
    'g',
  );
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  // --------------------- Add and delete datamodel ---------------------
  await processEditorPage.clickOnDataModelButton();
  await processEditorPage.waitForDataModelComboboxToBeVisible();

  await processEditorPage.clickOnDeleteDataModel();
  await processEditorPage.waitForAddDataModelButtonToBeVisible();

  await processEditorPage.clickOnAddDataModel();
  await processEditorPage.waitForDataModelComboboxToBeVisible();

  const dataModelName: string = 'model';
  await processEditorPage.clickOnDataModelCombobox();
  await processEditorPage.clickOnDataModelOption(dataModelName);
  await processEditorPage.waitForDataModelButtonToBeVisible();

  await processEditorPage.verifyDataModelButtonTextIsSelectedDataModel(dataModelName);
  await processEditorPage.verifyThatAddNewDataModelButtonIsHidden();

  // --------------------- Add actions ---------------------
  await processEditorPage.clickOnActionsAccordion();
  await processEditorPage.waitForAddActionsButtonToBeVisible();

  const actionIndex1: string = '1';
  await processEditorPage.clickAddActionsButton();
  await processEditorPage.waitForActionComboboxTitleToBeVisible(actionIndex1);

  const actionOptionWrite: string = 'write';
  await processEditorPage.clickOnActionCombobox(actionIndex1);
  await processEditorPage.clickOnActionOption(actionOptionWrite);
  await processEditorPage.removeFocusFromActionCombobox(actionIndex1);
  await processEditorPage.clickOnSaveActionButton();
  await processEditorPage.waitForActionButtonToBeVisible(actionIndex1, actionOptionWrite);

  // --------------------- Verify policy editor ---------------------
  await processEditorPage.clickOnPolicyAccordion();
  await processEditorPage.waitForNavigateToPolicyButtonIsVisible();
  await processEditorPage.clickOnNavigateToPolicyEditorButton();

  await processEditorPage.verifyThatPolicyEditorIsOpen();
  await processEditorPage.closePolicyEditor();
  await processEditorPage.verifyThatPolicyEditorIsClosed();

  // --------------------- Check that files are uploaded to Gitea ---------------------
  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);

  const numberOfPagesBackToAltinnStudio: number = 5;
  await giteaPage.goBackNPages(numberOfPagesBackToAltinnStudio);

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();

  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatActionIsVisible(actionOptionWrite);
});

test('That it is possible to add a new task to the process editor, configure some of its data', async ({
  page,
  testAppName,
}): Promise<void> => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new Header(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  // --------------------- Drag new task into the editor ---------------------
  const svgSelector = await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg');
  const dataTask: BpmnTaskType = 'data';
  await processEditorPage.dragTaskInToBpmnEditor(dataTask, svgSelector);
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(dataTask);
  const randomGeneratedId = await processEditorPage.getTaskIdFromOpenNewlyAddedTask();

  // --------------------- Edit the id ---------------------
  await processEditorPage.clickOnTaskIdEditButton(randomGeneratedId);
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdInputfield();

  const newId: string = 'my_new_id';
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(newId);

  // --------------------- Add new data model ---------------------
  await processEditorPage.clickOnAddDataModel();
  await processEditorPage.waitForDataModelComboboxToBeVisible();
  await processEditorPage.clickOnDataModelCombobox();
  await processEditorPage.verifyThatThereAreNoDataModelsAvailable();
  await processEditorPage.closeEmptyDataModelMessage();

  await header.clickOnNavigateToPageInTopMenuHeader('data_model');
  await dataModelPage.verifyDataModelPage();
  await dataModelPage.clickOnCreateNewDataModelButton();
  const newDataModel: string = 'testDataModel';
  await dataModelPage.typeDataModelName(newDataModel);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.waitForDataModelToAppear(newDataModel);
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();

  await header.clickOnNavigateToPageInTopMenuHeader('process_editor');
  await processEditorPage.verifyProcessEditorPage();
  const newTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(newId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(newTaskSelector);

  await processEditorPage.clickOnAddDataModel();
  await processEditorPage.waitForDataModelComboboxToBeVisible();
  await processEditorPage.clickOnDataModelCombobox();
  await processEditorPage.clickOnDataModelOption(newDataModel);
  await processEditorPage.waitForDataModelButtonToBeVisible();
  await processEditorPage.verifyDataModelButtonTextIsSelectedDataModel(newDataModel);

  // --------------------- Connect the task to the process ---------------------
  await processEditorPage.clickOnConnectionArrow();

  const initialId: string = 'Task_1';
  const initialTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(initialId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskSelector);

  // --------------------- Check that files are uploaded to Gitea ---------------------
  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsHidden(newId, dataTask);

  const numberOfPagesBackToAltinnStudio: number = 5;
  await giteaPage.goBackNPages(numberOfPagesBackToAltinnStudio);

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();

  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsVisible(newId, dataTask);

  await giteaPage.verifySequenceFlowDirection(newId, initialId);
  const numblerBackToConfig: number = 2;
  await giteaPage.goBackNPages(numblerBackToConfig);
  await giteaPage.clickOnApplicationMetadataFile();
  await giteaPage.verifyIdInDataModel(newId, newDataModel);
});

// Helper function
const goToGiteaAndNavigateToProcessBpmnFile = async (header: Header, giteaPage: GiteaPage) => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnProcessFilesButton();
  await giteaPage.clickOnProcessBpmnFile();
};
