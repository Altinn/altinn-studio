import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DataModelPage } from '../../pages/DataModelPage';
import { DesignerApi } from '../../helpers/DesignerApi';
import { CreateServicePage } from 'testing/playwright/pages/CreateServicePage';

test('should load datamodel page and ', async ({ page, testAppName, request }): Promise<void> => {
  /*
  const createServicePage = new CreateServicePage(page);
  await createServicePage.loadCreateAppFormPage();
  await createServicePage.writeAppName(testAppName);
  await createServicePage.clickOnCreateAppButton();
  await createServicePage.verifyIsNavigatedToOverviewPage();
  */

  const designerApi = new DesignerApi({ app: testAppName });
  console.log('In the test - testAppName: ', testAppName);
  const response = await designerApi.createApp(request);

  console.log('In the test - request: ', request);
  console.log('In the test - response: ', response);
  expect(response.ok()).toBeTruthy();

  const dataModelPage = new DataModelPage(page, { app: testAppName });

  await dataModelPage.loadDataModelPage();
  await dataModelPage.verifyDataModelPage();

  // Add datamodel
  await dataModelPage.clickOnCreateNewDataModelButton();
  await dataModelPage.addDataModelName();
  await dataModelPage.clickOnCreateModelButton();

  // Add object
  await dataModelPage.clickOnAddPropertyButton();
  await dataModelPage.clickOnAddObjectPropertyMenuItem();

  // Rename the new object
  // await dataModelPage.checkThatName0Exists();
});
