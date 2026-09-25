import { expect, test, type Page } from '@playwright/test';
import { build } from 'esbuild';
import path from 'node:path';
import type { FixtureOptions } from './StudioSuggestion.fixture';

let script: string;
let styles: string;

test.beforeAll(async () => {
  // Bundle the actual React wrapper and web component; jsdom does not reproduce their focus timing.
  const { outputFiles } = await build({
    entryPoints: [path.join(__dirname, 'StudioSuggestion.fixture.tsx')],
    bundle: true,
    write: false,
    outfile: 'suggestion.js',
    format: 'iife',
    globalName: 'suggestionFixture',
    jsx: 'automatic',
    loader: { '.module.css': 'local-css', '.png': 'dataurl' },
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  script = outputFiles.find((file) => file.path.endsWith('.js')).text;
  styles = outputFiles.find((file) => file.path.endsWith('.css')).text;
});

for (const controlled of [true, false]) {
  test.describe(controlled ? 'controlled' : 'uncontrolled', () => {
    for (const { text, expected, creatable } of [
      { text: '', expected: null, creatable: false },
      { text: 'Second', expected: '2', creatable: false },
      { text: 'New value', expected: 'New value', creatable: true },
    ]) {
      test(`commits ${JSON.stringify(text)} before another control removes the field`, async ({
        page,
      }) => {
        await renderSuggestion(page, { controlled, creatable, unmountOnClick: true });
        await page.getByRole('combobox', { name: /^Choice/ }).fill(text);
        await expect(page.getByLabel('Changes')).toHaveText('[]');
        // Keep focus and removal in one browser task, before the deferred blur handlers run.
        await page
          .getByRole('button', { name: 'Outside', exact: true })
          .evaluate((button: HTMLButtonElement) => {
            button.focus();
            button.click();
          });

        await expect(page.getByRole('combobox', { name: /^Choice/ })).toHaveCount(0);
        await expect(page.getByLabel('Changes')).toHaveText(JSON.stringify([expected]));
      });
    }

    test('clears once, updates the field, and can select and clear again', async ({ page }) => {
      await renderSuggestion(page, { controlled });
      const input = page.getByRole('combobox', { name: /^Choice/ });
      await input.fill('');
      await page.getByRole('button', { name: 'Outside', exact: true }).click();
      await expect(page.getByLabel('Changes')).toHaveText('[null]');
      await expect(input).toHaveValue('');

      await input.fill('Second');
      await input.press('Enter');
      await expect(page.getByLabel('Changes')).toHaveText('[null,"2"]');
      await input.fill('');
      await input.press('Tab');
      await expect(page.getByLabel('Changes')).toHaveText('[null,"2",null]');
    });
  });
}

test('commits a clear-button click before the field is removed', async ({ page }) => {
  await renderSuggestion(page, { unmountOnClick: true });
  await page.getByRole('combobox', { name: /^Choice/ }).focus();
  await page.getByRole('button', { name: 'Tøm', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[]');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[null]');
});

test('reports another edit after a controlled consumer rejects the previous one', async ({
  page,
}) => {
  await renderSuggestion(page, { controlled: true, rejectChange: true });
  const input = page.getByRole('combobox', { name: /^Choice/ });
  await input.fill('');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[null]');

  await input.fill('First');
  await input.fill('');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[null,null]');
});

test('commits when focus moves into another suggestion', async ({ page }) => {
  await renderSuggestion(page);
  await page.getByRole('combobox', { name: /^Choice/ }).fill('Second');
  await page.getByRole('combobox', { name: /^Other choice/ }).click();
  await expect(page.getByLabel('Changes')).toHaveText('["2"]');
});

test('does not clear while the user chooses a replacement option', async ({ page }) => {
  await renderSuggestion(page, { controlled: true });
  await page.getByRole('combobox', { name: /^Choice/ }).fill('');
  await page.getByRole('option', { name: 'Second', exact: true }).click();
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('["2"]');
});

test('commits after keyboard focus passes through the clear button', async ({ page }) => {
  await renderSuggestion(page);
  const input = page.getByRole('combobox', { name: /^Choice/ });
  await input.fill('Second');
  await input.press('Tab');
  await expect(page.getByLabel('Changes')).toHaveText('[]');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Changes')).toHaveText('["2"]');
});

test('leaves invalid text uncommitted', async ({ page }) => {
  await renderSuggestion(page);
  await page.getByRole('combobox', { name: /^Choice/ }).fill('Invalid');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[]');
  await expect(page.getByRole('combobox', { name: /^Choice/ })).toHaveValue('First');
});

test('honors a custom matching callback', async ({ page }) => {
  await renderSuggestion(page, { rejectMatch: true });
  await page.getByRole('combobox', { name: /^Choice/ }).fill('Second');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[]');
});

test('leaves multiple selections intact when the search text is cleared', async ({ page }) => {
  await renderSuggestion(page, { multiple: true });
  const input = page.getByRole('combobox', { name: /^Choice/ });
  await input.fill('Second');
  await input.fill('');
  await page.getByRole('button', { name: 'Outside', exact: true }).click();
  await expect(page.getByLabel('Changes')).toHaveText('[]');
  await expect(
    page.getByRole('option', { name: 'First, Press to remove', exact: true, selected: true }),
  ).toBeVisible();
});

async function renderSuggestion(page: Page, options: FixtureOptions = {}): Promise<void> {
  page.on('pageerror', (error) => {
    throw error;
  });
  await page.route('http://suggestion.test/', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }),
  );
  await page.goto('http://suggestion.test/');
  await page.addStyleTag({ content: styles });
  await page.addScriptTag({ content: script });
  await page.evaluate((options) => window['suggestionFixture'].mount(options), options);
  await expect(page.getByRole('combobox', { name: /^Choice/ })).toBeVisible();
}
