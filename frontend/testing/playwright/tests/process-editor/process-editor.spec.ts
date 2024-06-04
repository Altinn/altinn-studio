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

  const initialTaskDataElementIdSelector: string = await bpmnJSQuery.getTaskById('Task_1');
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
});

test('That it is possible to click a task in the process editor, and add a new action', async ({
  page,
  testAppName,
}): Promise<void> => {});

test('That it is possible to click a task in the process editor, and navigate to policy editor', async ({
  page,
  testAppName,
}): Promise<void> => {});

test('That it is possible to add a new task to the process editor, and add it to the existing process', async ({
  page,
  testAppName,
}): Promise<void> => {});
