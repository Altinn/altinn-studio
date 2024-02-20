import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { TextEditorPage } from '../../pages/TextEditorPage';
import { Gitea } from '../../helpers/Gitea';
import { Header } from '../../components/Header';
import { UiEditorPage } from '../../pages/UiEditorPage';
import { ComponentType } from '../../enum/ComponentType';
import { LanguageCode } from '../../enum/LanguageCode';
import { GiteaPage } from 'testing/playwright/pages/GiteaPage';

// Variables and constants shared between tests
const PAGE_1: string = 'Side1';
const COMPONENT_ID: string = 'myId';
const INPUT_COMPONENT_LABEL: string = 'inputLabel';
const TEXT_KEY_FIELD_2: string = 'textKeyField2';

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

test('That it is possible to create a text at the ux-editor page, and that the text appears on text-editor page', async ({
  page,
  testAppName,
}) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });

  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();

  await uiEditorPage.clickOnPageAccordion(PAGE_1);
  await uiEditorPage.dragComponentInToDroppableList(ComponentType.Input);

  await uiEditorPage.deleteOldComponentId();
  await uiEditorPage.writeNewComponentId(COMPONENT_ID);
  await uiEditorPage.clickOnAddLabelText();

  await uiEditorPage.writeLabelTextInTextarea(INPUT_COMPONENT_LABEL);
  await uiEditorPage.clickOnSaveNewLabelName();
  await uiEditorPage.waitForTreeItemToGetNewLabel(INPUT_COMPONENT_LABEL);

  await header.clickOnNavigateToPageInTopMenuHeader('texts');
  await textEditorPage.verifyTextEditorPage();

  const textKey: string = `${PAGE_1}.${COMPONENT_ID}.title`;
  await textEditorPage.verifyThatTextareaIsVisibleWithCorrectId(LanguageCode.Nb, textKey);

  const textareaValue: string = await textEditorPage.getTextareaValue(LanguageCode.Nb, textKey);
  expect(textareaValue).toBe(INPUT_COMPONENT_LABEL);
});

test('That it is possible to edit a textkey, and that the key is updated on the ux-editor page', async ({
  page,
  testAppName,
}) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const uiEditorPage = new UiEditorPage(page, { app: testAppName });

  const oldTextKey: string = `${PAGE_1}.${COMPONENT_ID}.title`;
  await textEditorPage.verifyThatTextKeyIsVisible(oldTextKey);

  const newTextKey: string = `${oldTextKey}-new`;
  await updateTextKey(textEditorPage, oldTextKey, newTextKey);

  // When the button is clicked, it might take som ms for the API call to be executed - It is success when the textarea has upaded label
  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.Nb, newTextKey);

  await header.clickOnNavigateToPageInTopMenuHeader('create');
  await uiEditorPage.verifyUiEditorPage();
  await uiEditorPage.clickOnPageAccordion(PAGE_1);
  await uiEditorPage.verifyUiEditorPage(PAGE_1);

  await uiEditorPage.clickOnTreeItem(INPUT_COMPONENT_LABEL);
  await uiEditorPage.clickOnEditLabelText();
  await uiEditorPage.verifyThatTextKeyIsVisible(newTextKey);
  await uiEditorPage.verifyThatTextKeyIsHidden(oldTextKey);
});

test('That it is possible to add a new text, edit the id, and add a new language', async ({
  page,
  testAppName,
}) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);

  await textEditorPage.clickOnAddNewTextButton();
  await textEditorPage.waitForNewTextareaToAppear();

  await updateTextKey(textEditorPage, 'id_', TEXT_KEY_FIELD_2);

  const textValue: string = 'textValue';
  await textEditorPage.writeNewTextInTextarea(LanguageCode.Nb, TEXT_KEY_FIELD_2, textValue);

  await textEditorPage.openSelectLanguageCombobox();
  await textEditorPage.selectOptionFromLanguageCombobox(LanguageCode.En);
  await textEditorPage.clickOnAddLanguageButton();
  await textEditorPage.waitForLanguageCheckboxToAppear(LanguageCode.En);

  await textEditorPage.verifyThatTextareaIsHidden(LanguageCode.En, TEXT_KEY_FIELD_2);
  await textEditorPage.clickOnLanguageCheckbox(LanguageCode.En);
  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.En, TEXT_KEY_FIELD_2);

  await textEditorPage.writeNewTextInTextarea(LanguageCode.En, TEXT_KEY_FIELD_2, textValue);
});

test('', async ({ page, testAppName }) => {
  const textEditorPage = await setupAndVerifyTextEditorPage(page, testAppName);
  const header = new Header(page, { app: testAppName });
  const giteaPage = new GiteaPage(page, { app: testAppName });

  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.Nb, TEXT_KEY_FIELD_2);
  await textEditorPage.waitForTextareaToUpdateTheLabel(LanguageCode.En, TEXT_KEY_FIELD_2);

  // Click on Last opp dine endringer
  await header.clickOnUploadLocalChangesButton();
  // Valider endringer

  // Click on three dots menu
  // Click on go to Gitea

  // Click on App
  // Click on ui
  // Click on Layouts
  // Click on page1
  // Verify that textResourceBindings are present
  // Verify that the newId is present

  // Go back 3 // ui -> layout -> page1.json
  // Click on config
  // Click on text
  // Verify that resource.en.json is present
  // Verify that resource.nb.json is present

  // Click on resource.nb.json
  // Verify that newId is present and that the value is labelText
  // go back 1
  // click on resource.en.json
  // Verify that newId is present and that the value is the translated labelText
});

test('that texts added on text page becomes visible on Lage page and vice versa, as well as the texts are added correctly to Gitea', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyTextEditorPage(page, testAppName);

  // SKIP THIS
  // Click on three dots menu
  // Click on go to Gitea

  // SKIP THIS
  // Click on App
  // Click on ui
  // Click on Layouts
  // Click on page1
  // Verify that textResourceBindings are hidden

  // SKIP THIS
  // Go back 3 // ui -> layout -> page1.json
  // Click on config
  // Click on text
  // Verify that resource.en.json is not present
  // Verify that resource.nb.json is present
  // Click on resource.nb.json
  // Verify that newId is not present and that the value is labelText
  // go back 4 // App -> config -> text -> resource.nb.json

  // SKIP THIS
  // Verify textPage
  // Check that appName textfield is present
  // Create a new text value
  // Check that it is not visible

  // Go to lage page
  // Open Side 1
  // Drag a Input in
  // Create component id as componentId
  // Change komponent id - use componentId

  // Click add label
  // Create a new label text - labelText
  // Type a label - labelText
  // Click close

  // Go to tekst page
  // Verify text page
  // Verify that textbox with label 'Norsk oversettelse for {page1}.{componentId}.title' is visible
  // Verify that value in textbox is the value added - labelText

  // MAKE THIS NEW TEST
  // Load text editor page
  // Verify text editor page
  // Click on change ID button
  // Create newId value - newId
  // Type newId into field
  // Click edit button again

  // Go to Lage page
  // Click on Side1
  // Click on component - labelText
  // Click on edit label
  // Verify that new id is present
  // Close the edit mode

  // MAKE THIS NEW TEST
  // Load text editor page
  // Verify text editor page
  // Click on add new text button
  // Click on textbox with label 'Norsk oversettelse for {regex(id_*)}'
  // Write a text - translationTextNb
  // Click on language combobox
  // Click on engelsk option
  // Click on Legg til
  // Verify that textbox with label 'Engelsk oversettelse for {regex(id_*)}' is not visible
  // Verify that textbox with label 'Engelsk oversettelse for {regex(id_*)}' is not visible'
  // Select engelsk as an option in radiobutton
  // Verify that textbow with label 'Engelsk oversettelse for {regex(id_*)}' is visible
  // Verify that textbox with label 'Engelsk oversettelse for {regex(id_*)}' is visible'
  // Click on textbox with label 'Engelsk oversettelse for {regex(id_*)}'
  // Write text to the textbox

  // Add translation to newId

  // ------------- Above covered

  // MAKE THIS NEW TEST
  // Click on Last opp dine endringer
  // Valider endringer

  // Click on three dots menu
  // Click on go to Gitea

  // Click on App
  // Click on ui
  // Click on Layouts
  // Click on page1
  // Verify that textResourceBindings are present
  // Verify that the newId is present

  // Go back 3 // ui -> layout -> page1.json
  // Click on config
  // Click on text
  // Verify that resource.en.json is present
  // Verify that resource.nb.json is present

  // Click on resource.nb.json
  // Verify that newId is present and that the value is labelText
  // go back 1
  // click on resource.en.json
  // Verify that newId is present and that the value is the translated labelText
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
