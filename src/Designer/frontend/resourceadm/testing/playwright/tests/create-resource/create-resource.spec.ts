import { expect, test } from '@playwright/test';
import { ResourceDashboardPage } from '../../pages/ResourceDashboardPage';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';

const testResourceId = `playwright_resource`;

test.beforeAll(async ({ request, storageState }) => {
  // reset resources repo
  const designerApi = new DesignerApi();
  const resetResponse = await designerApi.resetResourceRepo(request, storageState as StorageState);
  expect(resetResponse.ok()).toBeTruthy();
});

test('should be able to create a new resource', async ({ page }): Promise<void> => {
  const resourceDashboardPage = new ResourceDashboardPage(page);
  await resourceDashboardPage.goto();
  await resourceDashboardPage.clickOnCreateNewResourceButton();
  await resourceDashboardPage.writeResourceName(testResourceId);
  await resourceDashboardPage.clickOnCreateResourceButton();
  await resourceDashboardPage.verifyResourcePage(testResourceId);
});
