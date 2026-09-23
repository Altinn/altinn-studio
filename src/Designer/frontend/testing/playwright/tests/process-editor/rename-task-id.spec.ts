import { test } from '../../extenders/testExtend';
import { expect } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';
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
  await changeTaskId(processEditorPage, renamedTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(renamedTaskId);

  await expect
    .poll(() => getLayoutSetIds(request, org, testAppName))
    .toEqual(expect.arrayContaining([renamedTaskId]));
  expect(await getLayoutSetIds(request, org, testAppName)).not.toContain(initialTaskId);

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
  await changeTaskId(processEditorPage, finalTaskId);
  await processEditorPage.waitForNewTaskIdButtonToBeVisible(finalTaskId);

  await expect
    .poll(() => getLayoutSetIds(request, org, testAppName))
    .toEqual(expect.arrayContaining([finalTaskId]));
  expect(await getLayoutSetIds(request, org, testAppName)).not.toContain(renamedTaskId);
  expect(await getProcessDefinition(request, org, testAppName)).toContain(`id="${finalTaskId}"`);
});

const changeTaskId = async (processEditorPage: ProcessEditorPage, newId: string): Promise<void> => {
  await processEditorPage.clickOnTaskIdEditButton();
  await processEditorPage.waitForEditIdInputFieldToBeVisible();
  await processEditorPage.emptyIdTextfield();
  await processEditorPage.writeNewId(newId);
  await processEditorPage.waitForTextBoxToHaveValue(newId);
  await processEditorPage.saveNewId();
};

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
