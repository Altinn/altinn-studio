import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DataModelPage } from '../../pages/DataModelPage';
import { DesignerApi } from '../../helpers/DesignerApi';
import { CreateServicePage } from 'testing/playwright/pages/CreateServicePage';

test('should load datamodel page and ', async ({ page, testAppName }): Promise<void> => {
  /*
  const createServicePage = new CreateServicePage(page);
  await createServicePage.loadCreateAppFormPage();
  await createServicePage.writeAppName(testAppName);
  await createServicePage.clickOnCreateAppButton();
  await createServicePage.verifyIsNavigatedToOverviewPage();
  */

  /*
  const designerApi = new DesignerApi();
  await designerApi.createApp({ app: testAppName });
  */

  const designerApi = new DesignerApi({ app: testAppName });
  console.log('APP NAME', testAppName);
  await designerApi.createApp();

  // TODO add test for create app ok

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
