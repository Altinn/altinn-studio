import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { TextEditorPage } from '../../pages/TextEditorPage';
import { Gitea } from '../../helpers/Gitea';

// Before the tests starts, we need to create the text editor app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyTextEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<TextEditorPage> => {
  const textEditorPage = new TextEditorPage(page, { app: testAppName });
  await textEditorPage.loadTextEditorPage();
  await textEditorPage.verifyTextEditorPage();
  return textEditorPage;
};

test('TODO - text', async ({ page, testAppName }) => {
  await setupAndVerifyTextEditorPage(page, testAppName);

  // TODO - Add the tests
});
