import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { test } from '../../extenders/testExtend';
import { DesignerApi } from '../../helpers/DesignerApi';
import type { StorageState } from '../../types/StorageState';
import { TextEditorPage } from '../../pages/TextEditorPage';
import { Gitea } from '../../helpers/Gitea';

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

test('TODO - text', async ({ page, testAppName }) => {
  await setupAndVerifyTextEditorPage(page, testAppName);

  // TODO - add the tests
});

test('that texts added on text page becomes visible on Lage page and vice versa, as well as the texts are added correctly to Gitea', async ({
  page,
  testAppName,
}) => {
  await setupAndVerifyTextEditorPage(page, testAppName);

  // Click on three dots menu
  // Click on go to Gitea

  // Click on App
  // Click on ui
  // Click on Layouts
  // Click on page1
  // Verify that textResourceBindings are hidden

  // Go back 3 // ui -> layout -> page1.json
  // Click on config
  // Click on text
  // Verify that resource.en.json is not present
  // Verify that resource.nb.json is present
  // Click on resource.nb.json
  // Verify that newId is not present and that the value is labelText
  // go back 4 // App -> config -> text -> resource.nb.json

  // Verify textPage

  // Check that appName textfield is present

  // Create a new text value
  // Check that it is not visible

  // Go to lage page
  // Open Side 1
  // Drag a Input in
  // Turn on beta
  // Create component id as componentId
  // Change komponent id - use componentId

  // Click combobox
  // Click label
  // Click plus sign
  // Create a new label text - labelText
  // Type a label - labelText
  // Click close
  // Verify that tree item changed name - labelText

  // Go to tekst page
  // Verify that textbox with label 'Norsk oversettelse for {page1}.{componentId}.title'
  // Verify that value is the value added - labelText

  // Click on change ID button
  // Create newId value - newId
  // Type newId into field
  // Click edit button again

  // Go to Lage page
  // Click on Side1
  // Click on component - labelText
  // Click on edit label
  // Verify that new id is present

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
