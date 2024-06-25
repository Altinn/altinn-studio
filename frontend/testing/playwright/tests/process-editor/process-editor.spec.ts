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

test('That it is possible to add and remove datamodel, and add actions to the default task in the process editor', async ({
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
  await processEditorPage.dataModelConfig.waitForDataModelButtonToBeVisibleWithValue('model');
  await processEditorPage.dataModelConfig.clickOnDataModelButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();

  await processEditorPage.dataModelConfig.clickOnDeleteDataModel();
  await processEditorPage.dataModelConfig.waitForAddDataModelButtonWithoutValueToBeVisible();

  await processEditorPage.dataModelConfig.clickOnAddButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();

  const dataModelName: string = 'model';
  await processEditorPage.dataModelConfig.clickOnCombobox();
  await processEditorPage.dataModelConfig.chooseOption(dataModelName);
  await processEditorPage.dataModelConfig.waitForDataModelButtonToBeVisibleWithValue(dataModelName);

  await processEditorPage.dataModelConfig.verifyDataModelButtonTextIsSelectedDataModel(
    dataModelName,
  );
  await processEditorPage.dataModelConfig.verifyThatAddNewDataModelButtonIsHidden();

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

  await processEditorPage.verifyProcessEditorPage();
  await commitAndPushToGitea(header);

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
  const newId: string = 'my_new_id';
  await editRandomGeneratedId(processEditorPage, randomGeneratedId, newId);

  // --------------------- Add new data model ---------------------
  await processEditorPage.dataModelConfig.clickOnAddButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();
  await processEditorPage.dataModelConfig.clickOnCombobox();
  await processEditorPage.dataModelConfig.verifyThatThereAreNoDataModelsAvailable();
  await processEditorPage.pressEscapeOnKeyboard();

  const newDataModel: string = 'testDataModel';
  await navigateToDataModelAndCreateNewDataModel(
    dataModelPage,
    processEditorPage,
    header,
    newDataModel,
  );
  const newTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(newId, 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(newTaskSelector);

  await processEditorPage.dataModelConfig.clickOnAddButton();
  await processEditorPage.dataModelConfig.waitForComboboxToBeVisible();
  await processEditorPage.dataModelConfig.clickOnCombobox();
  await processEditorPage.dataModelConfig.chooseOption(newDataModel);
  await processEditorPage.dataModelConfig.waitForDataModelButtonToBeVisibleWithValue(newDataModel);
  await processEditorPage.dataModelConfig.verifyDataModelButtonTextIsSelectedDataModel(
    newDataModel,
  );

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

  await processEditorPage.verifyProcessEditorPage();
  await commitAndPushToGitea(header);

  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTheNewTaskIsVisible(newId, dataTask);

  await giteaPage.verifySequenceFlowDirection(newId, initialId);
  const numblerBackToConfig: number = 2;
  await giteaPage.goBackNPages(numblerBackToConfig);
  await giteaPage.clickOnApplicationMetadataFile();
  await giteaPage.verifyIdInDataModel(newId, newDataModel);
});

test('That it is possible to add a new signing task, and update the datatypes to sign', async ({
  page,
  testAppName,
}): Promise<void> => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  // --------------------- Drag new task into the editor ---------------------
  const svgSelector = await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg');
  const signingTask: BpmnTaskType = 'signing';

  const extraMovingDistanceX: number = -120;
  const extraMovingDistanceY: number = 0;
  await processEditorPage.dragTaskInToBpmnEditor(
    signingTask,
    svgSelector,
    extraMovingDistanceX,
    extraMovingDistanceY,
  );
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(signingTask);
  const randomGeneratedId = await processEditorPage.getTaskIdFromOpenNewlyAddedTask();

  // --------------------- Edit the id ---------------------
  const newId: string = 'signing_id';
  await editRandomGeneratedId(processEditorPage, randomGeneratedId, newId);

  // --------------------- Add data types to sign ---------------------
  await processEditorPage.clickDataTypesToSignCombobox();
  const dataTypeToSign: string = 'ref-data-as-pdf';
  await processEditorPage.clickOnDataTypesToSignOption(dataTypeToSign);
  await processEditorPage.waitForDataTypeToSignButtonToBeVisible(dataTypeToSign);
  await processEditorPage.pressEscapeOnKeyboard();

  // --------------------- Verify correct actions ---------------------
  await processEditorPage.clickOnActionsAccordion();

  const actionIndex1: string = '1';
  const actionIndex2: string = '2';
  const actionOptionSign: string = 'sign';
  const actionOptionReject: string = 'reject';
  await processEditorPage.waitForActionButtonToBeVisible(actionIndex1, actionOptionSign);
  await processEditorPage.waitForActionButtonToBeVisible(actionIndex2, actionOptionReject);

  // --------------------- Check that files are uploaded to Gitea ---------------------
  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTaskIsHidden(signingTask);
  await giteaPage.verifyThatActionIsHidden(actionOptionSign);
  await giteaPage.verifyThatActionIsHidden(actionOptionReject);
  await giteaPage.verifyThatDataTypeToSignIsHidden(dataTypeToSign);

  const numberOfPagesBackToAltinnStudio: number = 5;
  await giteaPage.goBackNPages(numberOfPagesBackToAltinnStudio);

  await processEditorPage.verifyProcessEditorPage();
  await commitAndPushToGitea(header);

  await giteaPage.verifyThatTaskIsVisible(signingTask);
  await giteaPage.verifyThatActionIsVisible(actionOptionSign);
  await giteaPage.verifyThatActionIsVisible(actionOptionReject);
  await giteaPage.verifyThatDataTypeToSignIsVisible(signingTask);
});

test('That it is possible to create a custom receipt', async ({ page, testAppName }) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  // --------------------- Create new data model ---------------------
  const newDataModel: string = 'newDataModel';
  await navigateToDataModelAndCreateNewDataModel(
    dataModelPage,
    processEditorPage,
    header,
    newDataModel,
  );

  // --------------------- Add layout set id and data model id to the receipt ---------------------
  const endEvent: string = await bpmnJSQuery.getTaskByIdAndType('EndEvent_1', 'g');
  await processEditorPage.clickOnTaskInBpmnEditor(endEvent);
  await processEditorPage.waitForEndEventHeaderToBeVisible();

  await processEditorPage.clickOnReceiptAccordion();
  await processEditorPage.waitForCreateCustomReceiptButtonToBeVisible();

  await processEditorPage.clickOnCreateCustomReceipt();
  await processEditorPage.waitForLayoutTextfieldToBeVisible();

  const newLayoutSetId: string = 'layoutSetId';
  await processEditorPage.writeLayoutSetId(newLayoutSetId);
  await processEditorPage.dataModelConfig.clickOnAddDataModelCombobox();
  await processEditorPage.dataModelConfig.chooseOption(newDataModel);
  await processEditorPage.pressEscapeOnKeyboard();

  await processEditorPage.waitForSaveNewCustomReceiptButtonToBeVisible();
  await processEditorPage.clickOnSaveNewCustomReceiptButton();
  await processEditorPage.waitForEditLayoutSetIdButtonToBeVisible();

  // --------------------- Check that files are uploaded to Gitea ---------------------
  await goToGiteaAndNavigateToApplicationMetadataFile(header, giteaPage);
  await giteaPage.verifyThatCustomReceiptIsNotVisible();
  const numberOfPagesBackToAltinnStudio: number = 4;
  await giteaPage.goBackNPages(numberOfPagesBackToAltinnStudio);

  await processEditorPage.verifyProcessEditorPage();
  await commitAndPushToGitea(header);

  await goToGiteaAndNavigateToApplicationMetadataFile(header, giteaPage);
  await giteaPage.verifyThatCustomReceiptIsVisible();
});

// --------------------- Helper Functions ---------------------
const editRandomGeneratedId = async (
  processEditorPage: ProcessEditorPage,
  randomGeneratedId: string,
  newId: string,
): Promise<void> => {
  await processEditorPage.clickOnTaskIdEditButton(randomGeneratedId);
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdInputfield();
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(newId);
};

const goToGiteaAndNavigateToProcessBpmnFile = async (
  header: Header,
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

const commitAndPushToGitea = async (header: Header): Promise<void> => {
  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();
};

const navigateToDataModelAndCreateNewDataModel = async (
  dataModelPage: DataModelPage,
  processEditorPage: ProcessEditorPage,
  header: Header,
  newDataModelName: string,
): Promise<void> => {
  await header.clickOnNavigateToPageInTopMenuHeader('data_model');
  await dataModelPage.verifyDataModelPage();
  await dataModelPage.clickOnCreateNewDataModelButton();
  await dataModelPage.typeDataModelName(newDataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.waitForDataModelToAppear(newDataModelName);
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();
  await dataModelPage.waitForSuccessAlertToDisappear();

  await header.clickOnNavigateToPageInTopMenuHeader('process_editor');
  await processEditorPage.verifyProcessEditorPage();
};

const goToGiteaAndNavigateToApplicationMetadataFile = async (
  header: Header,
  giteaPage: GiteaPage,
): Promise<void> => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnApplicationMetadataFile();
};
