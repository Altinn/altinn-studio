import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { Gitea } from '../../helpers/Gitea';
import { ComponentType } from '../../enum/ComponentType';
import { Header } from '../../components/Header';
import { DataModelPage } from '../../pages/DataModelPage';
import { GiteaPage } from '../../pages/GiteaPage';

const getAppTestName = (app: string) => `bindings-${app}`;

// Before the tests starts, we need to create the data model app
test.beforeAll(async ({ testAppName, request, storageState }) => {
  // Create a new app
  const designerApi = new DesignerApi({ app: getAppTestName(testAppName) });
  const response = await designerApi.createApp(request, storageState as StorageState);
  expect(response.ok()).toBeTruthy();
});

test.afterAll(async ({ request, testAppName }) => {
  const gitea = new Gitea();
  const response = await request.delete(
    gitea.getDeleteAppEndpoint({ app: getAppTestName(testAppName) }),
  );
  expect(response.ok()).toBeTruthy();
});

const setupAndVerifyUiEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

test('That it is possible to add a data model binding, and that the files are updated accordingly in Gitea', async ({
  page,
  testAppName,
}): Promise<void> => {
  const app = getAppTestName(testAppName);
  const header = new Header(page, { app });
  const dataModelPage = new DataModelPage(page, { app });
  const giteaPage = new GiteaPage(page, { app });
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, app);

  const pageName: string = 'Side1';
  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, pageName);
  await uiEditorPage.verifyThatPageIsEmpty();

  const newInputLabel: string = 'Input Label 1';
  await uiEditorPage.dragComponentInToDroppableList(ComponentType.Input);
  await uiEditorPage.waitForComponentTreeItemToBeVisibleInDroppableList(ComponentType.Input);
  await addNewLabelToTreeItemComponent(uiEditorPage, newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton();
  await uiEditorPage.clickOnDataModelBindingsCombobox();
  await uiEditorPage.verifyThatThereAreNoOptionsInTheDataModelList();

  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, pageName);
  await giteaPage.verifyThatDataModelBindingsAreNotPresent();
  await giteaPage.goBackNPages(5); // 5 because of: Gitea -> App -> ui -> layouts -> page1.json

  await uiEditorPage.verifyUiEditorPage(pageName);

  await header.clickOnNavigateToPageInTopMenuHeader('datamodel');
  await dataModelPage.verifyDataModelPage();

  // Add datamodel
  await dataModelPage.clickOnCreateNewDataModelButton();
  const dataModelName: string = 'testdatamodel';
  await dataModelPage.typeDataModelName(dataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();
  await dataModelPage.waitForSuccessAlertToDisappear();

  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, pageName);
  await uiEditorPage.clickOnTreeItem(newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton();
  await uiEditorPage.clickOnDataModelBindingsCombobox();
  await uiEditorPage.verifyThatThereAreOptionsInTheDataModelList();

  const dataModelBindingName = 'property1';
  await uiEditorPage.clickOnDataModelPropertyOption(dataModelBindingName);
  await uiEditorPage.clickOnSaveDataModel();
  await uiEditorPage.waitForDataModelToBeSelected();

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.waitForPushToGiteaSpinnerToDisappear();
  await header.checkThatUploadSuccessMessageIsVisible();
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, pageName);
  await giteaPage.verifyThatDataModelBindingsAreVisible(dataModelBindingName);
});

const navigateInToLayoutJsonFile = async (giteaPage: GiteaPage, layoutName: string) => {
  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutsFilesButton();
  await giteaPage.clickOnLayoutJsonFile(layoutName);
};

const addNewLabelToTreeItemComponent = async (
  uiEditorPage: UiEditorPage,
  newInputLabel: string,
) => {
  await uiEditorPage.clickOnAddLabelText();
  await uiEditorPage.writeLabelTextInTextarea(newInputLabel);
  await uiEditorPage.clickOnSaveNewLabelName();
  await uiEditorPage.waitForTreeItemToGetNewLabel(newInputLabel);

  await uiEditorPage.verifyThatTreeItemByNameIsNotVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatTreeItemByNameIsVisibleInDroppableList(newInputLabel);
};

const openPageAccordionAndVerifyUpdatedUrl = async (
  uiEditorPage: UiEditorPage,
  pageName: string,
): Promise<void> => {
  await uiEditorPage.clickOnPageAccordion(pageName);
  await uiEditorPage.verifyUiEditorPage(pageName); // When clicking the page, the url is updated to include the layout
};
