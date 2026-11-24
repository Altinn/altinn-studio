import { breakpoints } from '@app/form-component/app-components/breakpoints/breakpoints';
import { AxeBuilder } from '@axe-core/playwright';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import type { Result } from 'axe-core';

import { expect } from 'test/e2e/playwright/helpers/assertions';
import { clearSelectionAndWait, waitUntilSaved } from 'test/e2e/playwright/helpers/waits';
import type { SnapshotViewport, ViewportName } from 'test/e2e/playwright/helpers/waits';

interface KnownViolation extends Pick<Result, 'id'> {
  spec: string;
  test: string;
  nodeLength: number;
  countTowardsExpected?: false;
}

/**
 * Known WCAG violations, keyed by spec path and test title as in test/e2e/support/custom.ts. The pilot only copies
 * the entries for the specs it ports. A full migration would move the list to one file that both suites read.
 * TODO: Fix all violations and remove this list
 */
const knownWcagViolations: KnownViolation[] = [
  {
    spec: 'anonymous-stateless-app/validation.ts',
    test: 'Should show validation message for missing name',
    id: 'list',
    nodeLength: 1,
  },
];

const testsDir = path.resolve(import.meta.dirname, '../tests');

/** The spec name as Cypress reports it, so that both suites can share the list of known violations */
function specName(testInfo: TestInfo) {
  return path.relative(testsDir, testInfo.file).replace(/\.spec\.ts$/, '.ts');
}

/**
 * Runs the WCAG (axe) tests on the page and fails on violations that are not in the list of known ones, like
 * cy.testWcag().
 */
export async function testWcag(page: Page, testInfo: TestInfo) {
  const spec = specName(testInfo);
  const includedImpacts = ['critical', 'serious', 'moderate'];
  // Like cypress-axe, which only injects axe into the top window, this checks the page but not the content of its
  // frames. AxeBuilder's default mode runs axe inside each frame, and never finishes on an IFrame component: the app
  // sandboxes those without allow-scripts, so axe's asynchronous work in the frame never runs. Legacy mode runs axe
  // once in the top window, and iframes: false keeps it from waiting for frames to answer.
  const results = await new AxeBuilder({ page }).setLegacyMode().options({ iframes: false }).analyze();
  const violations = results.violations.filter((violation) => includedImpacts.includes(violation.impact ?? ''));

  // cypress-axe only calls the violations callback when there are violations, so a page without any never checks
  // that the known violations were found. The entry above no longer occurs in either suite, and Cypress does not notice.
  if (violations.length === 0) {
    return;
  }

  const knownHere = knownWcagViolations.filter((known) => known.spec === spec && known.test === testInfo.title);
  const expectedHere = knownHere.filter((known) => known.countTowardsExpected === undefined);

  const newViolations: string[] = [];
  let foundKnownViolations = 0;
  for (const violation of violations) {
    const isKnown = knownHere.some(
      ({ id, nodeLength }) => id === violation.id && nodeLength === violation.nodes.length,
    );
    if (isKnown) {
      foundKnownViolations++;
      continue;
    }
    newViolations.push(
      [
        `id: ${violation.id}`,
        `impact: ${violation.impact}`,
        `descr: ${violation.description}`,
        `help: ${violation.help}`,
        `helpUrl: ${violation.helpUrl}`,
        `nodeLength: ${violation.nodes.length}`,
        `targets: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
      ].join('\n'),
    );
  }

  expect(newViolations, `New WCAG violations in ${spec} / ${testInfo.title}:\n\n${newViolations.join('\n\n')}`).toEqual(
    [],
  );
  expect(
    foundKnownViolations === expectedHere.length || foundKnownViolations === knownHere.length,
    `Expected to find ${expectedHere.length} or ${knownHere.length} known WCAG violations, but found ${foundKnownViolations} in this test`,
  ).toBe(true);
}

/**
 * Prepares the page for a visual snapshot and runs the WCAG tests, like cy.visualTesting().
 *
 * The Cypress command also sends a snapshot per viewport to Percy. That is left out until we decide how visual
 * testing should work with Playwright, so this only resizes the page to each snapshot viewport and waits for it to
 * settle, as Cypress does before each snapshot.
 */
export async function visualTesting(page: Page, testInfo: TestInfo, _name: string, { wcag = true } = {}) {
  await clearSelectionAndWait(page);
  await waitUntilSaved(page);

  // Running wcag tests before resizing, because the resizing of the viewport can cause some elements to re-render
  // and go slightly out of sync with the proper state of the application.
  if (wcag) {
    await testWcag(page, testInfo);
  }

  const original = page.viewportSize();
  if (!original) {
    throw new Error('visualTesting needs a fixed viewport');
  }
  const viewportSizes: Record<SnapshotViewport, { width: number; height: number }> = {
    desktop: { width: 1536, height: 768 },
    tablet: { width: breakpoints.md - 5, height: 1024 },
    mobile: { width: 360, height: 768 },
  };
  for (const [viewport, size] of Object.entries(viewportSizes) as [SnapshotViewport, typeof original][]) {
    await page.setViewportSize(size);
    await clearSelectionAndWait(page, viewport);

    // Saving happens after a debounce timeout, and new unsaved changes might appear after resizing.
    await waitUntilSaved(page);

    // Percy snapshot `${_name} (${viewport})` goes here, pending a decision on visual testing with Playwright.
  }

  // Reset to original viewport
  await page.setViewportSize(original);
  const targetViewport: ViewportName =
    original.width < breakpoints.sm
      ? 'mobile'
      : original.width < breakpoints.md
        ? 'tablet'
        : original.width < breakpoints.lg
          ? 'laptop'
          : 'desktop';
  await expect(page.locator(`html.viewport-is-${targetViewport}`)).toBeVisible();

  await clearSelectionAndWait(page);
}
