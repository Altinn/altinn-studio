import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { TextEditorPage } from '../../pages/TextEditorPage';
import { Gitea } from '../../helpers/Gitea';
import { AppDevelopmentHeader } from '../../components/AppDevelopmentHeader';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { ComponentType } from '../../enum/ComponentType';
import { LanguageCode } from '../../enum/LanguageCode';
import { GiteaPage } from '@studio/testing/playwright/pages/GiteaPage';

// Variables and constants shared between tests
const PAGE_1: string = 'Side1';
const COMPONENT_ID: string = 'myId';
const INPUT_COMPONENT_LABEL: string = 'inputLabel';
const TEXT_KEY_FIELD_2: string = 'textKeyField2';
const INITIAL_TEXT_KEY: string = `${PAGE_1}.${COMPONENT_ID}.title`;
const UPDATED_TEXT_KEY: string = `${INITIAL_TEXT_KEY}-new`;
const TEXT_VALUE_IN_TEXTAREA: string = 'textValue';

// This line must be there to ensure that the tests do not run in parallell, and
// that the before all call is being executed before we start the tests
test.describe.configure({ mode: 'serial' });

// Before the tests starts, we need to create the text editor app
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

const setupAndVerifyTextEditorPage = async (
  page: Page,
  testAppName: string,
): Promise<TextEditorPage> => {
  const textEditorPage = new TextEditorPage(page, { app: testAppName });
  await textEditorPage.loadTextEditorPage();
  await textEditorPage.verifyTextEditorPage();
  return textEditorPage;
};

test('That it is possible to create a text at the ui-editor page, and that the text appears on text-editor page', async ({
  page,
  testAppName,
}) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });

  await navigateToUiEditorAndVerifyPage(header, uiEditorPage);
  await uiEditorPage.dragComponentIntoDroppableList(ComponentType.Input);

  await uiEditorPage.deleteOldComponentId();
  await uiEditorPage.writeNewComponentId(COMPONENT_ID);
  await uiEditorPage.waitForXAmountOfMilliseconds(1000); // Wait for the API call to be done

  await uiEditorPage.clickOnTitleTextButton();
  await uiEditorPage.writeTitleTextInTextarea(INPUT_COMPONENT_LABEL);
  await uiEditorPage.clickOnSaveNewLabelName();
  await uiEditorPage.waitForTreeItemToGetNewLabel(INPUT_COMPONENT_LABEL);

  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('texts');
  await textEditorPage.verifyTextEditorPage();

  await textEditorPage.verifyThatTextareaIsVisibleWithCorrectId(LanguageCode.Nb, INITIAL_TEXT_KEY);

  const textareaValue: string = await textEditorPage.getTextareaValue(
    LanguageCode.Nb,
    INITIAL_TEXT_KEY,
  );
  expect(textareaValue).toBe(INPUT_COMPONENT_LABEL);
});

test('That it is possible to edit a textkey, and that the key is updated on the ui-editor page', async ({
  page,
  testAppName,
}) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });

  await textEditorPage.verifyThatTextKeyIsVisible(INITIAL_TEXT_KEY);
  await updateTextKey(textEditorPage, INITIAL_TEXT_KEY, UPDATED_TEXT_KEY);

  // When the button is clicked, it might take som ms for the API call to be executed - It is success when the textarea has updated label
  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.Nb, UPDATED_TEXT_KEY);

  await navigateToUiEditorAndVerifyPage(header, uiEditorPage);

  await uiEditorPage.clickOnTreeItem(INPUT_COMPONENT_LABEL);
  await uiEditorPage.clickOnTitleTextButton();
  await uiEditorPage.verifyThatTextKeyIsVisible(UPDATED_TEXT_KEY);
  await uiEditorPage.verifyThatTextKeyIsHidden(INITIAL_TEXT_KEY);
});

test('That it is possible to add another text key', async ({ page, testAppName }) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);

  await textEditorPage.clickOnAddNewTextButton();
  await textEditorPage.waitForNewTextareaToAppear();

  await updateTextKey(textEditorPage, 'id_', TEXT_KEY_FIELD_2);
  await textEditorPage.writeNewTextInTextarea(
    LanguageCode.Nb,
    TEXT_KEY_FIELD_2,
    TEXT_VALUE_IN_TEXTAREA,
  );
});

test('That it is possible to add a new language', async ({ page, testAppName }) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);

  await textEditorPage.selectLanguageFromCombobox(LanguageCode.En);
  await textEditorPage.clickOnAddLanguageButton();
  await textEditorPage.waitForLanguageCheckboxToAppear(LanguageCode.En);

  await textEditorPage.verifyThatTextareaIsHidden(LanguageCode.En, TEXT_KEY_FIELD_2);
  await textEditorPage.clickOnLanguageCheckbox(LanguageCode.En);
  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.En, TEXT_KEY_FIELD_2);

  await textEditorPage.writeNewTextInTextarea(
    LanguageCode.En,
    TEXT_KEY_FIELD_2,
    TEXT_VALUE_IN_TEXTAREA,
  );

  await textEditorPage.openSelectLanguageCombobox(); // Adding this to perform another action to force the API call to be done
});

test('That the newly added language with key is updated on ui-editor page', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });

  await navigateToUiEditorAndVerifyPage(header, uiEditorPage);
  await uiEditorPage.clickOnTreeItem(INPUT_COMPONENT_LABEL);
  await uiEditorPage.clickOnTitleTextButton();
  await uiEditorPage.verifyThatTextareaIsVisible(LanguageCode.En);
});

test('That it is possible to push the changes to Gitea and verify that the changes are uploaded', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new AppDevelopmentHeader(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await header.clickOnUploadLocalChangesButton();
  await header.clickOnValidateChanges();
  await header.waitForPushToGiteaSpinnerToDisappear();
  await header.checkThatUploadSuccessMessageIsVisible();
  await header.clickOnThreeDotsMenu();
  await header.clickOnGoToGiteaRepository();

  await giteaPage.verifyGiteaPage();
  await giteaPage.clickOnAppFilesButton();
  await giteaPage.clickOnUiFilesButton();
  await giteaPage.clickOnLayoutSetsFolder();
  await giteaPage.clickOnLayoutsFilesFolder();
  await giteaPage.clickOnLayoutJsonFile(PAGE_1);

  await giteaPage.verifyThatComponentIdIsVisible(COMPONENT_ID);
  await giteaPage.verifyThatTextResourceBindingsTitleIsVisible(UPDATED_TEXT_KEY);

  await giteaPage.goBackNPages(4); // ui -> layoutSet -> layouts -> page1.json
  await giteaPage.clickOnConfigFilesButton();
  await giteaPage.clickOnTextFilesButton();
  await giteaPage.verifyThatResourceJsonFileIsVisible(LanguageCode.Nb);
  await giteaPage.verifyThatResourceJsonFileIsVisible(LanguageCode.En);

  await giteaPage.clickOnResourceJsonFile(LanguageCode.Nb);
  await giteaPage.verifyLanguageFile(LanguageCode.Nb);
  await giteaPage.verifyTextIdAndValue(TEXT_KEY_FIELD_2, TEXT_VALUE_IN_TEXTAREA);
  await giteaPage.verifyTextIdAndValue(UPDATED_TEXT_KEY, INPUT_COMPONENT_LABEL);
  await giteaPage.verifyTextIdAndValue('appName', testAppName);

  await giteaPage.goBackNPages(1); // Back to texts overview
  await giteaPage.clickOnResourceJsonFile(LanguageCode.En);
  await giteaPage.verifyLanguageFile(LanguageCode.En);
  await giteaPage.verifyTextIdAndValue(TEXT_KEY_FIELD_2, TEXT_VALUE_IN_TEXTAREA);
  await giteaPage.verifyTextIdAndValue(UPDATED_TEXT_KEY, ''); // This is never set in the test
  await giteaPage.verifyTextIdAndValue('appName', testAppName);
});

const updateTextKey = async (
  textEditorPage: TextEditorPage,
  oldTextKey: string,
  newTextKey: string,
): Promise<void> => {
  await textEditorPage.clickOnChangeTextKeyButton(oldTextKey);
  await textEditorPage.writeNewTextKey(oldTextKey, newTextKey);
  await textEditorPage.clickOnChangeTextKeyButton(newTextKey);
};

const navigateToUiEditorAndVerifyPage = async (
  header: AppDevelopmentHeader,
  uiEditorPage: UiEditorPage,
): Promise<void> => {
  await header.verifyNoGeneralErrorMessage();
  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await uiEditorPage.clickOnUxEditorButton();
  await uiEditorPage.clickOnPageAccordion(PAGE_1);
  await uiEditorPage.verifyUiEditorPage(PAGE_1);
};
