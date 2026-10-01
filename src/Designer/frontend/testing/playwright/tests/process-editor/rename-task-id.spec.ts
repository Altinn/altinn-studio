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
const processStateRoute: string = '**/process-modelling/process-state';
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

test('renames the task folder and rejects IDs longer than the folder-name limit', async ({
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

test('restores saved task and folder IDs after discarding a rejected rename', async ({
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

  await page.route(processStateRoute, (route) =>
    route.request().method() === 'PUT'
      ? route.fulfill({ status: 400, body: 'Rejected by test' })
      : route.continue(),
  );
  await processEditorPage.clickOnTaskInBpmnEditor(
    await bpmnJSQuery.getTaskByIdAndType(renamedTaskId, 'g'),
  );
  const rejectedSave: Promise<Response> = waitForProcessStateSave(page);
  await changeTaskId(processEditorPage, rejectedTaskId);
  expect((await rejectedSave).status()).toBe(400);

  await expect(
    page.getByRole('alert').getByText(processEditorPage.textMock('process_editor.save_rejected')),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: processEditorPage.textMock('process_editor.configuration_panel_change_task_id'),
    }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: processEditorPage.textMock('process_editor.discard_changes') })
    .click();
  await expect(page.locator(`g[data-element-id="${renamedTaskId}"]`)).toBeVisible();
  await expect(page.locator(`g[data-element-id="${rejectedTaskId}"]`)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const layoutSetIdsAfterRejection: string[] = await getLayoutSetIds(request, org, testAppName);
  expect(layoutSetIdsAfterRejection).toContain(renamedTaskId);
  expect(layoutSetIdsAfterRejection).not.toContain(rejectedTaskId);
  const processDefinitionAfterRejection: string = await getProcessDefinition(
    request,
    org,
    testAppName,
  );
  expect(processDefinitionAfterRejection).toContain(`id="${renamedTaskId}"`);
  expect(processDefinitionAfterRejection).not.toContain(`id="${rejectedTaskId}"`);
  await page.unroute(processStateRoute);

  await processEditorPage.clickOnTaskInBpmnEditor(
    await bpmnJSQuery.getTaskByIdAndType(renamedTaskId, 'g'),
  );
  await expect(
    page.getByRole('button', {
      name: processEditorPage.textMock('process_editor.configuration_panel_change_task_id'),
    }),
  ).toBeEnabled();
  await saveTaskIdChange(processEditorPage, finalTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(finalTaskId);

  const layoutSetIds: string[] = await getLayoutSetIds(request, org, testAppName);
  expect(layoutSetIds).toContain(finalTaskId);
  expect(layoutSetIds).not.toContain(renamedTaskId);
  expect(await getProcessDefinition(request, org, testAppName)).toContain(`id="${finalTaskId}"`);
  const processStateSave = `PUT /designer/api/${org}/${testAppName}/process-modelling/process-state`;
  expect(changeRequests).toEqual([processStateSave, processStateSave]);
});

test('keeps the recommended task name when another task is renamed', async ({
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

  const taskAddSaved: Promise<Response> = waitForProcessStateSave(page);
  await processEditorPage.dragTaskInToBpmnEditor(
    'data',
    await bpmnJSQuery.getTaskByIdAndType('SingleDataTask', 'svg'),
  );
  expect((await taskAddSaved).ok()).toBeTruthy();
  const layoutSetsAfterTaskAdd: string[] = await getLayoutSetIds(request, org, testAppName);
  expect(layoutSetsAfterTaskAdd).toHaveLength(2);
  expect(layoutSetsAfterTaskAdd).toContain(finalTaskId);
  expect(layoutSetCreationsAndDeletions).toHaveLength(0);

  await page
    .getByRole('textbox', {
      name: processEditorPage.textMock('process_editor.recommended_action.new_name_label'),
    })
    .fill(namedTaskId);
  const taskNameSaved: Promise<Response> = waitForProcessStateSave(page);
  await page.getByRole('button', { name: processEditorPage.textMock('general.save') }).click();
  expect((await taskNameSaved).ok()).toBeTruthy();
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(namedTaskId);
  expect(layoutSetCreationsAndDeletions).toHaveLength(0);

  // Selection can lag behind the diagram reload.
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

const saveTaskIdChange = async (
  processEditorPage: ProcessEditorPage,
  newId: string,
): Promise<void> => {
  const saved: Promise<Response> = waitForProcessStateSave(processEditorPage.page);
  await changeTaskId(processEditorPage, newId);
  expect((await saved).ok()).toBeTruthy();
};

const waitForProcessStateSave = (page: Page): Promise<Response> =>
  page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' && response.url().endsWith('/process-state'),
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
