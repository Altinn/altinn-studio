import { test } from '../../extenders/testExtend';
import { expect } from '@playwright/test';
import type { APIRequestContext, Page, Response } from '@playwright/test';
import { Gitea } from '../../helpers/Gitea';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { ProcessEditorPage } from '../../pages/ProcessEditorPage';
import { BpmnJSQuery } from '../../helpers/BpmnJSQuery';
import { AppTemplate } from '../../enum/AppTemplate';

const initialTaskId: string = 'Task_1';
const renamedTaskId: string = 'RenamedTask';
const idLongerThanLayoutSetNameLimit: string = 'a'.repeat(29);
const rejectedTaskId: string = 'RejectedTask';
const finalTaskId: string = 'FinalTask';
const processDefinitionRoute: string = '**/process-modelling/process-definition';
const namedTaskId: string = 'NamedTask';
const lastTaskId: string = 'LastTask';

test.describe.configure({ mode: 'serial' });

test.skip(
  ({ testAppTemplate }) => testAppTemplate !== AppTemplate.V9,
  'Only a v9 app names the layout set after its task',
);

test.beforeAll(async ({ testAppName, testAppTemplate, request, storageState }) => {
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

test('that renaming a task renames its layout set, and a second rename follows the layout set naming rule', async ({
  page,
  request,
  testAppName,
}) => {
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  await processEditorPage.loadProcessEditorPage();
  await processEditorPage.verifyProcessEditorPage();
  const bpmnJSQuery = new BpmnJSQuery(page);
  const org: string = processEditorPage.org;

  await processEditorPage.clickOnTaskInBpmnEditor(
    await bpmnJSQuery.getTaskByIdAndType(initialTaskId, 'g'),
  );
  await saveTaskIdChange(processEditorPage, renamedTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(renamedTaskId);

  const layoutSetIds: string[] = await getLayoutSetIds(request, org, testAppName);
  expect(layoutSetIds).toContain(renamedTaskId);
  expect(layoutSetIds).not.toContain(initialTaskId);

  await changeTaskId(processEditorPage, idLongerThanLayoutSetNameLimit);
  await expect(
    page.getByText(processEditorPage.textMock('validation_errors.name_invalid')),
  ).toBeVisible();

  const processDefinition: string = await getProcessDefinition(request, org, testAppName);
  expect(processDefinition).toContain(`id="${renamedTaskId}"`);
  expect(processDefinition).not.toContain(idLongerThanLayoutSetNameLimit);
});

test('that a rejected save restores the saved process, so the next rename keeps the layout set in step', async ({
  page,
  request,
  testAppName,
}) => {
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  await processEditorPage.loadProcessEditorPage();
  await processEditorPage.verifyProcessEditorPage();
  const bpmnJSQuery = new BpmnJSQuery(page);
  const org: string = processEditorPage.org;
  const changeRequests: string[] = [];
  page.on('request', (sentRequest) => {
    if (sentRequest.method() !== 'GET' && sentRequest.url().includes('/designer/api/')) {
      changeRequests.push(`${sentRequest.method()} ${new URL(sentRequest.url()).pathname}`);
    }
  });

  await page.route(processDefinitionRoute, (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 400, body: 'Rejected by test' })
      : route.continue(),
  );
  await processEditorPage.clickOnTaskInBpmnEditor(
    await bpmnJSQuery.getTaskByIdAndType(renamedTaskId, 'g'),
  );
  await changeTaskId(processEditorPage, rejectedTaskId);

  await expect(
    page.getByText(processEditorPage.textMock('process_editor.save_bpmn_xml_error')),
  ).toBeVisible();
  await expect(page.locator(`g[data-element-id="${renamedTaskId}"]`)).toBeVisible();
  await expect(page.locator(`g[data-element-id="${rejectedTaskId}"]`)).toHaveCount(0);
  await page.waitForTimeout(1000); // Give any request triggered by restoring the process time to be sent
  expect(changeRequests).toEqual([
    `PUT /designer/api/${org}/${testAppName}/process-modelling/process-definition`,
  ]);
  expect(await getLayoutSetIds(request, org, testAppName)).toContain(renamedTaskId);
  await page.unroute(processDefinitionRoute);

  await processEditorPage.clickOnTaskInBpmnEditor(
    await bpmnJSQuery.getTaskByIdAndType(renamedTaskId, 'g'),
  );
  await saveTaskIdChange(processEditorPage, finalTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(finalTaskId);

  const layoutSetIds: string[] = await getLayoutSetIds(request, org, testAppName);
  expect(layoutSetIds).toContain(finalTaskId);
  expect(layoutSetIds).not.toContain(renamedTaskId);
  expect(await getProcessDefinition(request, org, testAppName)).toContain(`id="${finalTaskId}"`);
});

test('that naming a new task through the recommended action keeps its id when the process is edited again', async ({
  page,
  request,
  testAppName,
}) => {
  const processEditorPage = new ProcessEditorPage(page, { app: testAppName });
  await processEditorPage.loadProcessEditorPage();
  await processEditorPage.verifyProcessEditorPage();
  const bpmnJSQuery = new BpmnJSQuery(page);
  const org: string = processEditorPage.org;
  const layoutSetCreationsAndDeletions: string[] = [];
  page.on('request', (sentRequest) => {
    if (
      ['POST', 'DELETE'].includes(sentRequest.method()) &&
      sentRequest.url().includes('/layout-set')
    ) {
      layoutSetCreationsAndDeletions.push(`${sentRequest.method()} ${sentRequest.url()}`);
    }
  });

  const taskAddSaved: Promise<Response> = waitForProcessDefinitionSave(page);
  const layoutSetCreated: Promise<Response> = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().endsWith('/ui-folders/layout-sets'),
  );
  await processEditorPage.dragTaskInToBpmnEditor(
    'data',
    await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg'),
  );
  await Promise.all([taskAddSaved, layoutSetCreated]);
  expect(layoutSetCreationsAndDeletions).toHaveLength(1);

  await page
    .getByRole('textbox', {
      name: processEditorPage.textMock('process_editor.recommended_action.new_name_label'),
    })
    .fill(namedTaskId);
  await page.getByRole('button', { name: processEditorPage.textMock('general.save') }).click();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(namedTaskId);
  expect(layoutSetCreationsAndDeletions).toHaveLength(1);

  // A click made right after the reload does not select the task (cause not found), so the click is retried.
  const finalTaskSelector: string = await bpmnJSQuery.getTaskByIdAndType(finalTaskId, 'g');
  await expect(async () => {
    await processEditorPage.clickOnTaskInBpmnEditor(finalTaskSelector);
    await expect(
      page.getByText(
        `${processEditorPage.textMock('process_editor.configuration_panel_change_task_id')}${finalTaskId}`,
      ),
    ).toBeVisible({ timeout: 1000 });
  }).toPass();
  await saveTaskIdChange(processEditorPage, lastTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(lastTaskId);

  expect(await getLayoutSetIds(request, org, testAppName)).toEqual(
    expect.arrayContaining([namedTaskId, lastTaskId]),
  );
  const processDefinition: string = await getProcessDefinition(request, org, testAppName);
  expect(processDefinition).toContain(`id="${namedTaskId}"`);
  expect(processDefinition).toContain(`id="${lastTaskId}"`);
});

const changeTaskId = async (processEditorPage: ProcessEditorPage, newId: string): Promise<void> => {
  await processEditorPage.clickOnTaskIdEditButton();
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdTextfield();
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
};

// Designer cannot read the process definition while a save is writing it, so reads wait for the save to finish.
const saveTaskIdChange = async (
  processEditorPage: ProcessEditorPage,
  newId: string,
): Promise<void> => {
  const saved: Promise<Response> = waitForProcessDefinitionSave(processEditorPage.page);
  await changeTaskId(processEditorPage, newId);
  await saved;
};

const waitForProcessDefinitionSave = (page: Page): Promise<Response> =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' && response.url().endsWith('/process-definition'),
  );

const getLayoutSetIds = async (
  request: APIRequestContext,
  org: string,
  app: string,
): Promise<string[]> => {
  const response = await request.get(`/designer/api/${org}/${app}/ui-folders/layout-sets`);
  expect(response.ok()).toBeTruthy();
  const layoutSets: Array<{ id: string }> = await response.json();
  return layoutSets.map((layoutSet) => layoutSet.id);
};

const getProcessDefinition = async (
  request: APIRequestContext,
  org: string,
  app: string,
): Promise<string> => {
  const response = await request.get(
    `/designer/api/${org}/${app}/process-modelling/process-definition`,
  );
  expect(response.ok()).toBeTruthy();
  return response.text();
};
