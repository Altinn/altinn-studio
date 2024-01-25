import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DataModelPage } from '../../pages/DataModelPage';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the data model app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: testAppName });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test('Allows to add a datamodel, include an object with custom name and fields in it, generate a C# model from it, and then delete it', async ({
  page,
  testAppName,
}): Promise<void> => {
  // Load the data model page
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  await dataModelPage.loadDataModelPage();
  await dataModelPage.verifyDataModelPage();

  // Add datamodel
  await dataModelPage.clickOnCreateNewDataModelButton();
  const dataModelName: string = 'datamodel';
  await dataModelPage.typeDataModelName(dataModelName);
  await dataModelPage.clickOnCreateModelButton();

  // Add object
  await dataModelPage.clickOnAddPropertyButton();
  await dataModelPage.clickOnAddObjectPropertyMenuItem();

  const name0: string = 'name0';

  /**
   * Helper function that checks that the name0 is on the page, then replaces it with
   * the newName sent in, and then checking that the newName is on the screen.
   */
  const replaceName0WithNewTextValue = async (newName: string) => {
    await dataModelPage.checkThatTreeItemProperyExistsOnScreen(name0);
    await dataModelPage.clickOnTreeItemProperty(name0);
    const nameFieldValue = await dataModelPage.getNameFieldValue();
    expect(nameFieldValue).toEqual(name0);
    await dataModelPage.clearNameField();
    await dataModelPage.typeNewNameInNameField(newName);
    await dataModelPage.tabOutOfNameField();
    const newNameFieldValue = await dataModelPage.getNameFieldValue();
    expect(newNameFieldValue).toEqual(newName);
    await dataModelPage.checkThatTreeItemProperyExistsOnScreen(newName);
  };

  // Rename the object
  const treeItemTestName: string = 'test';
  await replaceName0WithNewTextValue(treeItemTestName);
  await dataModelPage.clickOnTreeItemProperty(treeItemTestName);

  // Helper function to add a new field to the test object added
  const addFieldToTheTestNode = async () => {
    await dataModelPage.focusOnTreeItemProperty(treeItemTestName);
    await dataModelPage.clickOnAddNodeToPropertyButton();
    await dataModelPage.clickOnAddFieldToNodeButton();
  };

  // Add 'text1' field to the object
  await addFieldToTheTestNode();
  await replaceName0WithNewTextValue('text1');

  // Add 'text2' field to the object
  await addFieldToTheTestNode();
  await replaceName0WithNewTextValue('text2');

  // Add 'number' field to the object
  await addFieldToTheTestNode();
  await dataModelPage.checkThatTreeItemProperyExistsOnScreen(name0);
  await dataModelPage.clickOnTreeItemProperty(name0);
  const oldComboboxValue = await dataModelPage.getTypeComboboxValue();
  const textOption = dataModelPage.getTypeComboboxOption('text');
  expect(oldComboboxValue).toEqual(textOption);

  // Change type to integer
  await dataModelPage.clickOnTypeCombobox();
  await dataModelPage.clickOnIntegerOption();
  const newComboboxValue = await dataModelPage.getTypeComboboxValue();
  const integerOption = dataModelPage.getTypeComboboxOption('integer');
  expect(newComboboxValue).toEqual(integerOption);

  // Rename the integer
  await replaceName0WithNewTextValue('number1');

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
  const dataModelName: string = 'testdatamodel';
  const dataModelFileName: string = `${dataModelName}.xsd`;
  await dataModelPage.selectFileToUpload(dataModelFileName);
  const dataModelComboboxValue = await dataModelPage.getDataModelOptionValue(dataModelName);
  expect(dataModelComboboxValue).toMatch(/\/testdatamodel.schema.json$/);

  await dataModelPage.checkThatDataModelOptionExists(dataModelName);
  await dataModelPage.clickOnDeleteDataModelButton();
  await dataModelPage.clickOnConfirmDeleteDataModelButton();
  await dataModelPage.checkThatDataModelOptionDoesNotExists(dataModelName);
});
