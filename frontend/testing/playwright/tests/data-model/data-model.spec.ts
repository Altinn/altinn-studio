import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DataModelPage } from '../../pages/DataModelPage';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { Gitea } from '../../helpers/Gitea';
import type { TextKey } from '../../helpers/BasePage';

// Before the tests starts, we need to create the data model app
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

test('Allows to add a data model, include an object with properties and a combination, check for visibility of type selector, generate a C# model from it, and then delete it', async ({
  page,
  testAppName,
}): Promise<void> => {
  // Load the data model page
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  await dataModelPage.loadDataModelPage();
  await dataModelPage.verifyDataModelPage();

  // Add data model
  await dataModelPage.clickOnCreateNewDataModelButton();
  const dataModelName: string = 'testDataModel';
  await dataModelPage.typeDataModelName(dataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.waitForDataModelToAppear(dataModelName);

  // Add object
  await dataModelPage.clickOnAddPropertyButton();
  await dataModelPage.clickOnAddObjectPropertyMenuItem();

  const name0: string = 'name0';

  /**
   * Helper function that checks that the name0 is on the page, then replaces it with
   * the newName sent in, and then checking that the newName is on the screen.
   */
  const replaceName0WithNewTextValue = async (newName: string) => {
    await dataModelPage.checkThatTreeItemPropertyExistsOnScreen(name0);
    await dataModelPage.clickOnTreeItemProperty(name0);
    const nameFieldValue = await dataModelPage.getNameFieldValue();
    expect(nameFieldValue).toEqual(name0);
    await dataModelPage.clearNameField();
    await dataModelPage.typeNewNameInNameField(newName);
    await dataModelPage.tabOutOfNameField();
    const newNameFieldValue = await dataModelPage.getNameFieldValue();
    expect(newNameFieldValue).toEqual(newName);
    await dataModelPage.checkThatTreeItemPropertyExistsOnScreen(newName);
  };

  // Rename the object
  const treeItemTestName: string = 'test';
  await replaceName0WithNewTextValue(treeItemTestName);
  await dataModelPage.clickOnTreeItemProperty(treeItemTestName);

  // Helper function to add a new property to the test object added
  const addPropertyToTheObjectNode = async (propertyName: TextKey) => {
    await dataModelPage.focusOnTreeItemProperty(treeItemTestName);
    await dataModelPage.clickOnObjectAddPropertyButton();
    await dataModelPage.clickOnAddPropertyToObjectButton(propertyName);
  };

  // Add 'text' property to the object
  await addPropertyToTheObjectNode('schema_editor.add_string');
  await replaceName0WithNewTextValue('text1');
  expect(await dataModelPage.isTypeComboboxVisible()).toBeFalsy();

  // Add 'number' property to the object
  await addPropertyToTheObjectNode('schema_editor.add_number');
  await dataModelPage.checkThatTreeItemPropertyExistsOnScreen(name0);
  await dataModelPage.clickOnTreeItemProperty(name0);
  await replaceName0WithNewTextValue('number1');
  expect(await dataModelPage.isTypeComboboxVisible()).toBeFalsy();

  // Add 'combo' combination property to the object
  await dataModelPage.clickOnAddPropertyButton();
  await dataModelPage.clickOnCombinationPropertyMenuItem();
  expect(await dataModelPage.isTypeComboboxVisible()).toBeTruthy();
  await dataModelPage.clickOnTypeCombobox();
  const typeValue = await dataModelPage.getTypeComboboxValue();
  expect(typeValue).toEqual('any_of');

  // Generate the data model
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();

  // Delete the data model
  await dataModelPage.checkThatDataModelOptionExists(dataModelName);
  await dataModelPage.clickOnDeleteDataModelButton();
  await dataModelPage.clickOnConfirmDeleteDataModelButton();
  await dataModelPage.checkThatDataModelOptionDoesNotExists(dataModelName);
});

test('Allows to upload and then delete an XSD file', async ({ page, testAppName }) => {
  // Load the data model page
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  await dataModelPage.loadDataModelPage();
  await dataModelPage.verifyDataModelPage();

  // Select the file to upload
  const dataModelName: string = 'testDataModel';
  const dataModelFileName: string = `${dataModelName}.xsd`;
  await dataModelPage.selectFileToUpload(dataModelFileName);
  await dataModelPage.waitForDataModelToBeUploaded();
  await dataModelPage.waitForDataModelToAppear(dataModelName);
  const dataModelComboboxValue = await dataModelPage.getDataModelOptionValue(dataModelName);
  expect(dataModelComboboxValue).toMatch(/\/testDataModel.schema.json$/);

  await dataModelPage.checkThatDataModelOptionExists(dataModelName);
  await dataModelPage.clickOnDeleteDataModelButton();
  await dataModelPage.clickOnConfirmDeleteDataModelButton();
  await dataModelPage.checkThatDataModelOptionDoesNotExists(dataModelName);
});
