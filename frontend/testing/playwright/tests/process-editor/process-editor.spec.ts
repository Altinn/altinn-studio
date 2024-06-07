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

// TRY TO SPLIT THE LARGE TEST INTO SMALLER ONES

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

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskByIdAndType(
    'Task_1',
    'g',
  );
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

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

  // Navigate to datamodel page, generate a new datamodel - see that it appears
});

/*
TODO WAIT FOR COMBOBOX MERGE

test('That it is possible to click a task in the process editor, add a new action, and open the policy editor', async ({
  page,
  testAppName,
}): Promise<void> => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);

  // ADD WRITTEN ACTIONS TOO

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskById('Task_1');
  await processEditorPage.clickOnInitialTask(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  await processEditorPage.clickOnActionsAccordion(); // Maybe combine with below
  await processEditorPage.waitForAddActionsButtonToBeVisible();

  await processEditorPage.clickAddActionsButton();
  await processEditorPage.waitForActionComboboxToBeVisible('1');

  await processEditorPage.clickOnActionCombobox('1');
  await processEditorPage.clickOnActionOption('write');
  await processEditorPage.clickOnSaveActionButton();
  await processEditorPage.waitForActionButtonToBeVisible('write');

  await processEditorPage.clickOnPolicyAccordion(); // Maybe combine with above
  await processEditorPage.waitForNavigateToPolicyButtonIsVisible();
  await processEditorPage.clickOnNavigateToPolicyEditorButton();
});
*/

test('That it is possible to add a new task to the process editor, configure some of its data', async ({
  page,
  testAppName,
}): Promise<void> => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new Header(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  // Drag task in to editor and get new id
  const svgSelector = await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg');
  const dataTask: BpmnTaskType = 'data';
  await processEditorPage.dragTaskInToBpmnEditor(dataTask, svgSelector);
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(dataTask);
  const randomGeneratedId = await processEditorPage.getTaskIdFromOpenNewlyAddedTask();

  // Edit the random id to a chosen id
  await processEditorPage.clickOnTaskIdEditButton(randomGeneratedId);
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdInputfield();

  const newId: string = 'my_new_id';
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(newId);

  // Add datamodel
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

  // Connect the task to the process
  await processEditorPage.clickOnConnectionArrow();

  const initialId: string = 'Task_1';
  const initialTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(initialId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskSelector);

  // Add two actions
  /*
  await processEditorPage.clickOnActionsAccordion();
  await processEditorPage.waitForAddActionsButtonToBeVisible();
  await processEditorPage.clickAddActionsButton();
  */

  // Verify that changes does not exist on git
  await goToGiteaAndNavigateToProcessBpmnFilee(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsHidden(newId, dataTask);

  const numberOfPagesBackToAltinnStudio: number = 5;
  await giteaPage.goBackNPages(numberOfPagesBackToAltinnStudio);

  // Commit changes
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();

  // Navigate to Gitea
  await goToGiteaAndNavigateToProcessBpmnFilee(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsVisible(newId, dataTask);

  // TODO - verify actions
  await giteaPage.verifySequenceFlowDirection(newId, initialId); //
  const numblerBackToConfig: number = 2;
  await giteaPage.goBackNPages(numblerBackToConfig);
  await giteaPage.clickOnApplicationMetadataFile();
  await giteaPage.verifyIdInDataModel(newId, newDataModel);
});

const goToGiteaAndNavigateToProcessBpmnFilee = async (header: Header, giteaPage: GiteaPage) => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnProcessFilesButton();
  await giteaPage.clickOnProcessBpmnFile();
};
