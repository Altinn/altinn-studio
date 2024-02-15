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

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
// Test nr. 2 is dependent on test 1, and therefore is "serial" important
test.describe.configure({ mode: 'serial' });

// Variables that are shared between tests
const PAGE_1: string = 'Side1';

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
): Promise<UiEditorPage> => {
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });
  await uiEditorPage.loadUiEditorPage();
  await uiEditorPage.verifyUiEditorPage();
  return uiEditorPage;
};

test('That it is possible to add and delete form components', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);

  await uiEditorPage.verifyThatPageIsEmpty();

  await uiEditorPage.dragComponentInToDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatComponentTreeItemIsVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatPageEmptyMessageIsHidden();
  await uiEditorPage.clickOnDeleteInputComponentButton();

  await uiEditorPage.verifyThatPageIsEmpty();
});

test('That when adding more than one page, navigation buttons are added to the pages', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);
  const page2: string = 'Side2';

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);

  await uiEditorPage.verifyThatPageIsEmpty();

  await uiEditorPage.clickOnAddNewPage();
  await uiEditorPage.verifyThatNewPageIsVisible(page2);
  await uiEditorPage.verifyUiEditorPage(page2);

  await uiEditorPage.verifyThatPageEmptyMessageIsHidden();
  await uiEditorPage.verifyThatNavigationButtonsAreAddedToPage();

  await uiEditorPage.clickOnPageAccordion(PAGE_1);
  await uiEditorPage.verifyUiEditorPage(PAGE_1);
  await uiEditorPage.verifyThatPageEmptyMessageIsHidden();
  await uiEditorPage.verifyThatNavigationButtonsAreAddedToPage();
});

test('That it is possible to add a Header component and edit the name of the component', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);

  await uiEditorPage.openTextComponentSection();
  await uiEditorPage.dragComponentInToDroppableListItem({
    componentToDrag: ComponentType.Header,
    componentToDropOn: ComponentType.Input,
  });
  await uiEditorPage.verifyThatComponentTreeItemIsVisibleInDroppableList(ComponentType.Header);

  await uiEditorPage.waitForXAmountOfMilliseconds(2000);

  const newHeaderName: string = 'New Header';
  await addNewLabelToTreeItemComponent(uiEditorPage, newHeaderName);
});

test('That it is possible to add a data model binding, and that the files are updated accordingly in Gitea', async ({
  page,
  testAppName,
}): Promise<void> => {
  const header = new Header(page, { app: testAppName });
  const dataModelPage = new DataModelPage(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);
  await uiEditorPage.verifyThatComponentTreeItemIsVisibleInDroppableList(ComponentType.Input);

  const newInputLabel: string = 'Input Label 1';
  await uiEditorPage.clickOnTreeItemByComponentType(ComponentType.Input);
  await addNewLabelToTreeItemComponent(uiEditorPage, newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton();
  await uiEditorPage.clickOnDataModelBindingsCombobox();
  await uiEditorPage.verifyThatThereAreNoOptionsInTheDataModelList();

  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, PAGE_1);
  await giteaPage.verifyThatDataModelBindingsAreNotPresent();
  await giteaPage.goBackNPages(5); // 5 because of: Gitea -> App -> ui -> layouts -> page1.json

  await uiEditorPage.verifyUiEditorPage(PAGE_1);

  await header.clickOnNavigateToPageInTopMenuHeader('datamodel');
  await dataModelPage.verifyDataModelPage();

  // Add datamodel
  await dataModelPage.clickOnCreateNewDataModelButton();
  const dataModelName: string = 'testdatamodel';
  await dataModelPage.typeDataModelName(dataModelName);
  await dataModelPage.clickOnCreateModelButton();
  await dataModelPage.clickOnGenerateDataModelButton();
  await dataModelPage.checkThatSuccessAlertIsVisibleOnScreen();

  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);
  await uiEditorPage.clickOnTreeItem(newInputLabel);

  await uiEditorPage.clickOnAddDataModelButton();
  await uiEditorPage.clickOnDataModelBindingsCombobox();
  await uiEditorPage.verifyThatThereAreOptionsInTheDataModelList();

  // MAYBE WE NEED TO ADD THE DATAMODEL PROPERTY MANUALLY?
  const dataModelBindingName = 'property1';
  await uiEditorPage.clickOnDataModelPropertyOption(dataModelBindingName);
  await uiEditorPage.clickOnSaveDataModel();

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.checkThatUploadSuccessMessageIsVisible();
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await navigateInToLayoutJsonFile(giteaPage, PAGE_1);
  await giteaPage.verifyThatDataModelBindingsAreVisible(dataModelBindingName);
});

const openPageAccordionAndVerifyUpdatedUrl = async (
  uiEditorPage: UiEditorPage,
  pageName: string,
): Promise<void> => {
  await uiEditorPage.clickOnPageAccordion(pageName);
  await uiEditorPage.verifyUiEditorPage(pageName); // When clicking the page, the url is updated to include the layout
};

const addNewLabelToTreeItemComponent = async (
  uiEditorPage: UiEditorPage,
  newInputLabel: string,
) => {
  await uiEditorPage.clickOnAddLabelText();
  await uiEditorPage.writeLabelTextInTextarea(newInputLabel);
  await uiEditorPage.clickOnSaveNewLabelName();

  // We need to wait a few seconds to make sure that the API call is made and that the changes are saved to backend
  await uiEditorPage.waitForXAmountOfMilliseconds(2000);

  await uiEditorPage.verifyThatTreeItemByNameIsNotVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatTreeItemByNameIsVisibleInDroppableList(newInputLabel);
};

const navigateInToLayoutJsonFile = async (giteaPage: GiteaPage, layoutName: string) => {
  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutsFilesButton();
  await giteaPage.clickOnLayoutJsonFile(layoutName);
};
