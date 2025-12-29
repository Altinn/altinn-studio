import { check } from 'https://jslib.k6.io/k6-utils/1.5.0/index.js';
import { fail } from 'k6';
import { browser, Page } from 'k6/browser';
import exec from 'k6/execution';
import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { Options } from 'k6/options';

const BASE_URL = __ENV.BASE_URL || 'http://local.altinn.cloud';
const SCREENSHOTS_DIR = '/tmp';

// Test data constants
const TEST_DATA = {
  USER: 'DDG Fitness AS (Organisation)',
  AUTH_LEVEL: 'Nivå 2',
  APPLICATION: 'ttd/frontend-test',
  FRONTEND_VERSION: 'http://localhost:8080/',
  SELECTED_ANIMAL_LABEL: 'Hund',
  SELECTED_ANIMAL: 'Dog',
} as const;

const SELECTORS = {
  MY_PETS_TABLE: /mine kjæledyr/i,
  SPECIES_SELECT: /art/i,
  FRONTEND_TEST_HEADING: /frontend-test/i,
  APP_DESCRIPTION_HEADING: /Appen for test av app frontend/i,
} as const;

const MESSAGES = {
  RESTART_FORM: 'Du har allerede startet å fylle ut dette skjemaet.',
  DEV_SERVER_TEXT: 'Local dev-server on port 8080',
} as const;

export const options: Options = {
  scenarios: {
    performanceTest: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
};

// Custom metrics
const add250RepeatingGroupRowsMetric = new Trend('add_250_repeating_group_rows', true);
const speciesSelectOpenTimeMetric = new Trend('species_select_open_time', true);
const speciesSelectTotalTimeMetric = new Trend('species_select_total_time', true);
const manualRowAdditionTimeMetric = new Trend('manual_row_addition_time', true);

function takeScreenshot(page: Page, name: string, description?: string): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${name}.png`;

    page.screenshot({
      path: `${SCREENSHOTS_DIR}/${filename}`,
      fullPage: true,
    });

    console.log(`Screenshot saved: ${filename}${description ? ` - ${description}` : ''}`);
  } catch (error) {
    console.log(`Failed to take screenshot ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function setup() {
  let res = http.get(BASE_URL);
  if (res.status !== 200) {
    exec.test.abort(`Got unexpected status code ${res.status} when trying to setup. Exiting.`);
  }
}

export default async function () {
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(BASE_URL);
    takeScreenshot(page, 'initial-page-load', 'Initial page load');

    await localtestLogin(page);
    takeScreenshot(page, 'after-login', 'Successfully logged in to localtest');

    await goToCorrectPage(page);
    takeScreenshot(page, 'after-navigation', 'Successfully navigated to pets page');

    // Round 1
    await generate250MorePets(page, /hent mine husdyr \(250!\)/i);
    takeScreenshot(page, 'after-generate-round1', 'Generated 250 pets - Round 1');
    await editLastPet(page);
    takeScreenshot(page, 'after-edit-round1', 'Edited last pet - Round 1');
    await addPetManually(page, 'Fido');
    takeScreenshot(page, 'after-manual-add-round1', 'Added pet manually - Round 1 (Fido)');

    // Round 2
    await generate250MorePets(page, /generer enda en gård/i);
    takeScreenshot(page, 'after-generate-round2', 'Generated 250 more pets - Round 2');
    await editLastPet(page);
    takeScreenshot(page, 'after-edit-round2', 'Edited last pet - Round 2');
    await addPetManually(page, 'Lady');
    takeScreenshot(page, 'after-manual-add-round2', 'Added pet manually - Round 2 (Lady)');

    // Round 3
    await generate250MorePets(page, /generer enda en gård/i);
    takeScreenshot(page, 'after-generate-round3', 'Generated 250 more pets - Round 3');
    await editLastPet(page);
    takeScreenshot(page, 'after-edit-round3', 'Edited last pet - Round 3');
    await addPetManually(page, 'Herman');
    takeScreenshot(page, 'test-completed', 'Test completed successfully - Added Herman');
  } catch (error) {
    takeScreenshot(
      page,
      'main-test-error',
      `Browser iteration failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    fail(`Browser iteration failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

async function localtestLogin(page: Page) {
  try {
    // Set the frontend version through cookie
    await page.context().addCookies([
      {
        name: 'frontendVersion',
        value: TEST_DATA.FRONTEND_VERSION,
        url: BASE_URL,
        httpOnly: true,
      },
    ]);

    await page.locator('select[name="UserSelect"]').waitFor({ state: 'visible' });

    const appSelect = page.getByRole('combobox', { name: /select app to test/i });
    const userSelect = page.getByRole('combobox', { name: /select test users/i });
    const authSelect = page.getByRole('combobox', { name: /select your authentication level/i });

    // Select options from dropdowns
    await appSelect.selectOption(TEST_DATA.APPLICATION);
    await userSelect.selectOption(TEST_DATA.USER);
    await authSelect.selectOption(TEST_DATA.AUTH_LEVEL);

    // Check that the selects have correctly selected options
    check(page, {
      'user select has correct text': async () =>
        (await userSelect.getByRole('option', { selected: true }).textContent()) === TEST_DATA.USER,
      'auth level has correct text': async () =>
        (await authSelect.getByRole('option', { selected: true }).textContent()) === TEST_DATA.AUTH_LEVEL,
    });

    await page.getByRole('button', { name: /proceed to app/i }).click();
    await page.waitForNavigation();

    if ((await page.getByRole('heading', { level: 2 }).textContent()) === MESSAGES.RESTART_FORM) {
      await page.getByRole('button', { name: /start på nytt/i }).click();
    }
  } catch (error) {
    takeScreenshot(
      page,
      'localtest-login-error',
      `Localtest login failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log(`Localtest login failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Re-throw to fail the test
  }
}

async function goToCorrectPage(page: Page) {
  try {
    await page.getByRole('heading', { level: 1, name: SELECTORS.FRONTEND_TEST_HEADING }).textContent();
    await page.getByRole('heading', { level: 2, name: SELECTORS.APP_DESCRIPTION_HEADING }).textContent();

    await page.getByRole('button', { name: /velg neste steg/i }).click();
    await page
      .getByRole('radiogroup', { name: /velg neste steg/i })
      .getByRole('radio', { name: /repeterende grupper \(task_3\)/i })
      .click();

    await page.getByRole('button', { name: /gå til/i }).click();

    await page.getByRole('button', { name: /3\. kjæledyr/i }).click();
  } catch (error) {
    takeScreenshot(
      page,
      'go-to-correct-page-error',
      `Going to correct page failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log(`Going to correct page failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error; // Re-throw to fail the test
  }
}

async function generate250MorePets(screen: Page, buttonName: RegExp) {
  try {
    const startTime = Date.now();
    await screen.getByRole('button', { name: buttonName }).click();
    await screen.waitForFunction(
      (regExp: RegExp) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const button = buttons.find((btn) => btn.textContent?.match(regExp));
        return button && !button.disabled;
      },
      {},
      buttonName,
    );
    const endTime = Date.now();

    add250RepeatingGroupRowsMetric.add(endTime - startTime);
  } catch (error) {
    takeScreenshot(
      screen,
      'generate-more-pets-error',
      `Generating more pets failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log(`Generating more pets failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function editLastPet(page: Page) {
  try {
    const openStartTime = Date.now();

    const lastRowSpeciesSelect = page
      .getByRole('table', { name: SELECTORS.MY_PETS_TABLE })
      .getByRole('row')
      .last()
      .getByRole('combobox', { name: SELECTORS.SPECIES_SELECT });

    await lastRowSpeciesSelect.click();

    // Wait for select to be open
    await page.locator('table tr:last-child u-combobox u-datalist').waitFor({ state: 'attached' });

    const openEndTime = Date.now();

    speciesSelectOpenTimeMetric.add(openEndTime - openStartTime);

    const selectOptionStartTime = Date.now();

    // For custom u-combobox, we need to click the option manually
    await page.getByRole('option', { name: new RegExp(TEST_DATA.SELECTED_ANIMAL_LABEL, 'i') }).click();

    // Wait for the select have the correct value
    await page.waitForFunction(
      (animal) => {
        const lastRow = Array.from(document.querySelectorAll('tr')).at(-1) as HTMLTableRowElement;
        const selectedLabel = lastRow.querySelector('u-combobox')?._value;
        return selectedLabel === animal;
      },
      {},
      TEST_DATA.SELECTED_ANIMAL_LABEL,
    );

    const selectOptionEndTime = Date.now();
    speciesSelectTotalTimeMetric.add(selectOptionEndTime - selectOptionStartTime);

    // Verify the selection was successful
    check(page, {
      'Species select responds and selects animal': async () => {
        const selectedValue = await lastRowSpeciesSelect.inputValue();
        return (
          selectedValue === TEST_DATA.SELECTED_ANIMAL_LABEL || selectedValue.includes(TEST_DATA.SELECTED_ANIMAL_LABEL)
        );
      },
    });
  } catch (error) {
    takeScreenshot(
      page,
      'edit-last-pet-error',
      `Edit last pet test failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log(`Edit last pet test failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function addPetManually(page: Page, petName: string) {
  try {
    const startTime = Date.now();
    await page.getByRole('button', { name: /legg til kjæledyr/i }).click();
    const editContainerSelector = 'tr div[id*="group-edit-container"]';
    const editContainer = page.locator(editContainerSelector);
    await editContainer.waitFor({ state: 'visible' });

    const datalist = editContainer.locator('u-datalist').first();

    await datalist.waitFor({ state: 'attached' });

    await page.getByRole('option', { name: new RegExp(TEST_DATA.SELECTED_ANIMAL_LABEL, 'i') }).click();

    // Wait for the select have the correct value
    await page.waitForFunction(
      (animal) => {
        const lastRow = Array.from(document.querySelectorAll('tr')).at(-1) as HTMLTableRowElement;
        const select = Array.from(lastRow.querySelectorAll('u-combobox')).at(0);

        const selectedLabel = select?.values.at(0);

        return selectedLabel === animal;
      },
      {},
      TEST_DATA.SELECTED_ANIMAL,
    );

    const lastRow = page.getByRole('table', { name: SELECTORS.MY_PETS_TABLE }).getByRole('row').last();

    const nameInput = lastRow.getByRole('textbox', { name: /navn/i });
    await nameInput.click();
    await nameInput.type(petName);

    const ageInput = lastRow.getByRole('textbox', { name: /alder/i });
    await ageInput.click();
    await ageInput.clear();
    await ageInput.type('3');

    await lastRow.getByRole('button', { name: /lagre og lukk/i }).click();

    await page.locator(editContainerSelector).waitFor({ state: 'detached' });

    const endTime = Date.now();

    manualRowAdditionTimeMetric.add(endTime - startTime);
  } catch (error) {
    takeScreenshot(
      page,
      'add-pet-manually-error',
      `Adding pet manually failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.log(`Adding pet manually failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
