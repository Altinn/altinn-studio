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
import { SettingsPage } from '../../pages/SettingsPage';

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

test('that the user is able to add and delete data model', async ({ page, testAppName }) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskByIdAndType(
    'Task_1',
    'g',
  );
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  await processEditorPage.dataModelConfig.clickOnDesignAccordion();
  await processEditorPage.dataModelConfig.waitForDataModelButtonToBeVisibleWithValue('model');
  await processEditorPage.dataModelConfig.clickOnDataModelButton('model');
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
  await processEditorPage.dataModelConfig.verifyThatAddNewDataModelLinkButtonIsHidden();
});

test('that the user able to open policy editor', async ({ page, testAppName }) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskByIdAndType(
    'Task_1',
    'g',
  );
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  await processEditorPage.policyConfig.clickOnPolicyAccordion();
  await processEditorPage.policyConfig.waitForNavigateToPolicyLinkIsVisible();
  await processEditorPage.policyConfig.clickOnNavigateToPolicyEditorLink();

  await processEditorPage.policyConfig.verifyThatPolicyEditorIsOpen();
});

test.skip('Opening the settings page after the user has opened it from the process editor and navigated to another tab', async ({
  page,
  testAppName,
}) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const bpmnJSQuery = new BpmnJSQuery(page);
  const settingsPage = new SettingsPage(page, { app: testAppName });

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskByIdAndType(
    'Task_1',
    'g',
  );
  await processEditorPage.clickOnTaskInBpmnEditor(initialTaskDataElementIdSelector);
  await processEditorPage.waitForInitialTaskHeaderToBeVisible();

  await processEditorPage.policyConfig.clickOnPolicyAccordion();
  await processEditorPage.policyConfig.waitForNavigateToPolicyLinkIsVisible();
  await processEditorPage.policyConfig.clickOnNavigateToPolicyEditorLink();
  await processEditorPage.policyConfig.verifyThatPolicyEditorIsOpen();

  await settingsPage.navigateToTab('setup');
  await settingsPage.verifyThatTabIsVisible('setup');
});

test.skip('that the user can edit the id of a task and add data-types to sign', async ({
  page,
  testAppName,
}) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  const signingTask = await addNewSigningTaskToProcessEditor(page);

  const newId: string = 'signing_id';
  await editRandomGeneratedId(processEditorPage, newId);

  await processEditorPage.signingTaskConfig.clickDataTypesToSignCombobox();
  const dataTypeToSign: string = 'ref-data-as-pdf';
  await processEditorPage.signingTaskConfig.clickOnDataTypesToSignOption(dataTypeToSign);
  await processEditorPage.signingTaskConfig.waitForDataTypeToSignButtonToBeVisible(dataTypeToSign);
  await processEditorPage.pressEscapeOnKeyboard();

  await commitAndPushToGitea(header);
  await goToGiteaAndNavigateToProcessBpmnFile(header, giteaPage);
  await giteaPage.verifyThatTaskIsVisible(signingTask);
  await giteaPage.verifyThatDataTypeToSignIsVisible(signingTask);
});

test.skip('That it is possible to create a custom receipt', async ({ page, testAppName }) => {
  const processEditorPage = await setupAndVerifyProcessEditorPage(page, testAppName);
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const bpmnJSQuery = new BpmnJSQuery(page);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
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

  await processEditorPage.customReceiptConfig.clickOnReceiptAccordion();
  await processEditorPage.customReceiptConfig.waitForCreateCustomReceiptButtonToBeVisible();

  await processEditorPage.customReceiptConfig.clickOnCreateCustomReceipt();
  await processEditorPage.customReceiptConfig.waitForLayoutTextfieldToBeVisible();

  const newLayoutSetId: string = 'layoutSetId';
  await processEditorPage.customReceiptConfig.writeLayoutSetId(newLayoutSetId);
  await processEditorPage.dataModelConfig.clickOnAddDataModelCombobox();
  await processEditorPage.dataModelConfig.chooseOption(newDataModel);

  await processEditorPage.customReceiptConfig.waitForSaveNewCustomReceiptButtonToBeVisible();
  await processEditorPage.customReceiptConfig.clickOnSaveNewCustomReceiptButton();
  await processEditorPage.customReceiptConfig.waitForEditLayoutSetIdButtonToBeVisible();

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

const addNewSigningTaskToProcessEditor = async (page: Page): Promise<string> => {
  const bpmnJSQuery = new BpmnJSQuery(page);
  const processEditorPage = new ProcessEditorPage(page);
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
  await processEditorPage.skipRecommendedTask();
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel(signingTask);

  return signingTask;
};

const editRandomGeneratedId = async (
  processEditorPage: ProcessEditorPage,
  newId: string,
): Promise<void> => {
  await processEditorPage.clickOnTaskIdEditButton();
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdTextfield();
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(newId);
};

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

const goToGiteaAndNavigateToApplicationMetadataFile = async (
  header: AppDevelopmentHeader,
  giteaPage: GiteaPage,
): Promise<void> => {
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnApplicationMetadataFile();
};
