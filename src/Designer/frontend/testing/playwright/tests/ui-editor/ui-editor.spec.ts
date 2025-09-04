import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { Gitea } from '../../helpers/Gitea';
import { ComponentType } from '../../enum/ComponentType';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
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
  await uiEditorPage.clickOnUxEditorButton();
  await uiEditorPage.verifyThatAddNewPageButtonIsVisible();

  return uiEditorPage;
};

test.skip('That it is possible to add and delete form components', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);

  await uiEditorPage.verifyThatPageIsEmpty();

  await uiEditorPage.dragComponentIntoDroppableList(ComponentType.Input);
  await uiEditorPage.waitForComponentTreeItemToBeVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatPageEmptyMessageIsHidden();
});

test.skip('That when adding more than one page, navigation buttons are added to the pages', async ({
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

test.skip('That it is possible to add a Header component to the page when there is already a component on the page and edit the name of the component', async ({
  page,
  testAppName,
}): Promise<void> => {
  const uiEditorPage = await setupAndVerifyUiEditorPage(page, testAppName);

  await openPageAccordionAndVerifyUpdatedUrl(uiEditorPage, PAGE_1);

  await uiEditorPage.openTextComponentSection();
  await uiEditorPage.waitForDraggableToolbarItemToBeVisible(ComponentType.Header);

  await uiEditorPage.dragComponentIntoDroppableListItem({
    componentToDrag: ComponentType.Header,
    componentToDropOn: ComponentType.Input,
  });
  await uiEditorPage.waitForComponentTreeItemToBeVisibleInDroppableList(ComponentType.Header);

  const newHeaderName: string = 'New Header';
  await addNewLabelToTreeItemComponent(uiEditorPage, newHeaderName);
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
  await uiEditorPage.clickOnTitleTextButton();
  await uiEditorPage.writeTitleTextInTextarea(newInputLabel);
  await uiEditorPage.clickOnSaveNewLabelName();
  await uiEditorPage.waitForTreeItemToGetNewLabel(newInputLabel);

  await uiEditorPage.verifyThatTreeItemByNameIsNotVisibleInDroppableList(ComponentType.Input);
  await uiEditorPage.verifyThatTreeItemByNameIsVisibleInDroppableList(newInputLabel);
};
