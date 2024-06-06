import { test } from '../../extenders/testExtend';
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { BpmnJSQuery } from '../../helpers/BpmnJSQuery';

/*
### Scenario 2
SCENARIO: User edits task ID
WHEN the user selects a task in the process editor
THEN the details of that task are visible in the configuration panel on the right-hand side.
WHEN the user clicks on the task ID
THEN the task ID field becomes editable
WHEN the user changes the task ID
THEN the task ID is updated in the GUI
  AND the task ID is updated in the `process.bpmn` file
  AND the task ID is updated in `applicationMetadata.json` file
*/

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
  await processEditorPage.clickOnInitialTask(initialTaskDataElementIdSelector);
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

  // Drag task in to editor and get new id
  const svgSelector = await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg');
  await processEditorPage.dragTaskInToBpmnEditor('data', svgSelector);
  await processEditorPage.waitForTaskToBeVisibleInConfigPanel('data');
  const randomGeneratedId = await processEditorPage.getTaskIdFromOpenNewlyAddedTask();

  // Edit the random id to a chosen id
  await processEditorPage.clickOnTaskIdEditButton(randomGeneratedId);
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdInputfield();

  const newId: string = 'my_new_id';
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  // await processEditorPage.saveNewId();

  await processEditorPage.waitForNewTaskIdButtonToBeVisible(newId);

  // Add datamodel

  // Add two actions
  await processEditorPage.clickOnActionsAccordion();

  // Navigate to Gitea
});

// Drag new element in, add one datamodel connection, add two actions, navigate to gitea, check that all is ok

// Click arrow - do something - SequenceFlow_*
