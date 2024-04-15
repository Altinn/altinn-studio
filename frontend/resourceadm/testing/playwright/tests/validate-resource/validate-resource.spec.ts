import { expect, test } from '@playwright/test';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { ResourcePage } from '../../pages/ResourcePage';
import { GiteaApi } from '../../helpers/GiteaApi';

const resourceId = 'playwright_deploy_resource';

test.beforeAll(async ({ request, storageState }) => {
  // re-create resources repo
  const giteaApi = new GiteaApi();
  await giteaApi.deleteResourcesRepo(request);
  await giteaApi.createResourcesRepo(request);

  const designerApi = new DesignerApi(resourceId);
  const resetResponse = await designerApi.resetResourceRepo(request, storageState as StorageState);
  expect(resetResponse.ok()).toBeTruthy();

  // create resource
  const createResourceResponse = await designerApi.createResource(
    request,
    storageState as StorageState,
  );
  expect(createResourceResponse.ok()).toBeTruthy();
});

test('should be able to validate resource so it is ready to be deployed', async ({
  page,
}): Promise<void> => {
  const resourcePage = new ResourcePage(page, resourceId);
  await resourcePage.goto();
  await resourcePage.setResourceType();
  await resourcePage.writeNameNbTextField('navn');
  await resourcePage.writeNameNnTextField('namn');
  await resourcePage.writeNameEnTextField('name');
  await resourcePage.writeDescriptionNbTextField('beskrivelse');
  await resourcePage.writeDescriptionNnTextField('beskrivning');
  await resourcePage.writeDescriptionEnTextField('description');
  await resourcePage.writeRightsDescriptionNbTextField('delegeringstekst');
  await resourcePage.writeRightsDescriptionNnTextField('delegeringstekst');
  await resourcePage.writeRightsDescriptionEnTextField('delegation text');
  await resourcePage.setStatus();
  await resourcePage.writeCategoryTextField('category');
  await resourcePage.setAvailableForType();
  await page.waitForTimeout(500); // wait for 500ms for save resource debounce to trigger
  await resourcePage.gotoPolicyTab();
  await resourcePage.clickAddPolicyRule();
  await resourcePage.setPolicyAction();
  await resourcePage.setPolicySubject();
  await resourcePage.gotoPublishTab();
  await resourcePage.writeVersionTextField(`${Date.now()}`);
  await page.waitForTimeout(500); // wait for 500ms for save resource debounce to trigger
  await resourcePage.clickUploadChangesButton();
  await resourcePage.clickValidateChangesButtonButton();
  await resourcePage.verifyDeployAlertVisible();
});
