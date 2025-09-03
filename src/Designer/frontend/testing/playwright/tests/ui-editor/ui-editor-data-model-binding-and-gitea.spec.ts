import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { Gitea } from '../../helpers/Gitea';
import { ComponentType } from '../../enum/ComponentType';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';
import { DataModelPage } from '../../pages/DataModelPage';
import { GiteaPage } from '../../pages/GiteaPage';

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

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(gitea.getDeleteAppEndpoint({ app: testAppName }));
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyUiEditorPage = async (
  page: Page,
  testAppName: string,
  featureFlag?: string[],
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  if (featureFlag) {
    await page.evaluate((flag) => {
      localStorage.setItem('featureFlags', JSON.stringify(flag));
    }, featureFlag);
  }

  await uiEditorPage.clickOnUxEditorButton();
  await uiEditorPage.verifyThatAddNewPageButtonIsVisible();

  await uiEditorPage.clickOnPageAccordion(pageName);
  await uiEditorPage.verifyUiEditorPage(pageName);

  return uiEditorPage;
};

test.skip('That it is possible to drag in a new component, add a title to the newly added component and add a data model binding', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  await uiEditorPage.verifyThatPageIsEmpty();

  await uiEditorPage.dragComponentIntoDroppableList(ComponentType.Input);
  await uiEditorPage.waitForComponentTreeItemToBeVisibleInDroppableList(ComponentType.Input);

  await uiEditorPage.clickOnTitleTextButton();
  await uiEditorPage.writeTitleTextInTextarea(newInputLabel);
  await uiEditorPage.clickOnSaveNewLabelName();
  await uiEditorPage.waitForTreeItemToGetNewLabel(newInputLabel);

  await uiEditorPage.verifyThatTreeItemByNameIsNotVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatTreeItemByNameIsVisibleInDroppableList(newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton(ComponentType.Input);
  await uiEditorPage.clickOnDataModelFieldBindingCombobox();
});

test('That it is possible to navigate to Gitea and that data model bindings are not present', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, pageName);
  await giteaPage.verifyThatDataModelBindingsAreNotPresent();
  await giteaPage.goBackNPages(6); // 5 because of: Gitea -> App -> ui -> layoutsSet -> layouts -> page1.json

  await uiEditorPage.verifyUiEditorPage(pageName);
});

test('That it is possible to navigate to datamodel page and create a new data model', async ({
  page,
  testAppName,
}): Promise<void> => {
  await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('data_model');
  await dataModelPage.verifyDataModelPage();

  const dataModelName: string = 'testDataModel';
  await createNewDataModel(dataModelPage, dataModelName);
});

test.skip('That it is possible to navigate back to ui-editor page and add the data model', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await uiEditorPage.clickOnPageAccordion(pageName);
  await uiEditorPage.verifyUiEditorPage(pageName);
  await uiEditorPage.clickOnTreeItem(newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton(ComponentType.Input);
  await uiEditorPage.clickOnDataModelFieldBindingCombobox();
  await uiEditorPage.verifyThatThereAreOptionsInTheDataModelFieldList();

  await uiEditorPage.clickOnDataModelFieldPropertyOption(dataModelBindingName);
  await uiEditorPage.clickOnSaveDataModel();
  await uiEditorPage.waitForDataModelToBeSelected();
});

test('That it is possible to upload the changes to Gitea and view the changes in Gitea', async ({
  page,
  testAppName,
}): Promise<void> => {
  await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.waitForPushToGiteaSpinnerToDisappear();
  await header.checkThatUploadSuccessMessageIsVisible();
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, pageName);
  await giteaPage.verifyThatDataModelBindingsAreVisible(
    `"simpleBinding": "${dataModelBindingName}"`,
  );
});

test.skip('That it is possible to navigate to data model page and create another data model', async ({
  page,
  testAppName,
}): Promise<void> => {
  await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('data_model');
  await createNewDataModel(dataModelPage, newDataModel);
});

test.skip('That it is possible to navigate back to ui-editor page and add the newly added data model using data model binding combobox', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await uiEditorPage.clickOnPageAccordion(pageName);
  await uiEditorPage.verifyUiEditorPage(pageName);

  await uiEditorPage.dragComponentIntoDroppableList(ComponentType.Input);
  await uiEditorPage.waitForComponentTreeItemToBeVisibleInDroppableList(ComponentType.Input);

  await uiEditorPage.clickOnAddDataModelButton(ComponentType.Input);
  await uiEditorPage.clickOnDataModelBindingCombobox();
  await uiEditorPage.clickOnDataModelPropertyOption(newDataModel);
  await uiEditorPage.clickOnSaveDataModel();
  await uiEditorPage.waitForDataModelToBeSelected();
});

test('That it is possible to upload to Gitea and that files are updated correctly', async ({
  page,
  testAppName,
}): Promise<void> => {
  await setupAndVerifyUiEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.waitForPushToGiteaSpinnerToDisappear();
  await header.checkThatUploadSuccessMessageIsVisible();
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, pageName);
  await giteaPage.verifyThatDataModelBindingsAreVisible(
    `"simpleBinding": { "field: "", dataType: "${newDataModel}" }`,
  );
});

// Shared variables
const pageName: string = 'Side1';
const newInputLabel: string = 'Input Label 1';
const dataModelBindingName: string = 'property1';
const newDataModel: string = 'testDataModel2';

// Helper functions
const navigateInToLayoutJsonFile = async (giteaPage: GiteaPage, layoutName: string) => {
  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutSetsFolder();
  await giteaPage.clickOnLayoutsFilesFolder();
  await giteaPage.clickOnLayoutJsonFile(layoutName);
};

const createNewDataModel = async (
  dataModelPage: DataModelPage,
  dataModelName: string,
): Promise<void> => {
  await dataModelPage.clickOnCreateNewDataModelButton();
  await dataModelPage.typeDataModelName(dataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.waitForDataModelToAppear(dataModelName);
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();
  await dataModelPage.waitForSuccessAlertToDisappear();
};
