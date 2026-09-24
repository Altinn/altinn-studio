import { test, expect, type Page } from '@playwright/test';

/**
 * Engine smoke suite.
 *
 * Assertions are written against the *shape* of the registry (first id, last
 * id, slide count, total states) rather than a hard-coded list of every slide,
 * so re-ordering the middle of the deck does not break the suite — but losing
 * a slide or a build step does, which is the failure worth hearing about.
 */
const FIRST_ID = 'forside';
/** A slide deep in the deck, and a build step inside it, for the deep-link test. */
const DEEP = { hash: '/#/9/7', id: 'scenario-feil', step: '7' };
/** The last reserve slide — `End` goes past the closing slide to the reserve. */
const LAST_ID = 'prosessmotor';
const TOTAL = 22;
/** Build steps on slide 1 — the first `→` must build, not navigate. */
const FIRST_SLIDE_STEPS = 2;
/** Build steps on the last slide, so `→` parks there fully built. */
const LAST_SLIDE_STEPS = 3;
/**
 * 22 slides + 62 build steps = every state a presenter clicks through. Each
 * scenario slide contributes 14: six beats per version, the switch, and the
 * comparison.
 */
const TOTAL_STATES = 84;

const root = (page: Page) => page.locator('[data-deck-root]');

async function settle(page: Page) {
  await expect(root(page)).toHaveAttribute('data-transitioning', 'false');
}

async function position(page: Page): Promise<string> {
  const el = root(page);
  const index = await el.getAttribute('data-slide-index');
  const step = await el.getAttribute('data-slide-step');
  return `${index}/${step}`;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(root(page)).toBeVisible();
  await settle(page);
});

test('opens on the first slide', async ({ page }) => {
  await expect(root(page)).toHaveAttribute('data-slide-index', '0');
  await expect(root(page)).toHaveAttribute('data-slide-id', FIRST_ID);
  await expect(page.locator('.deck-progress__count-total')).toHaveText(
    String(TOTAL).padStart(2, '0'),
  );
});

test('ArrowRight advances build steps before the slide', async ({ page }) => {
  for (let s = 1; s <= FIRST_SLIDE_STEPS; s++) {
    await page.keyboard.press('ArrowRight');
    await expect(root(page)).toHaveAttribute('data-slide-index', '0');
    await expect(root(page)).toHaveAttribute('data-slide-step', String(s));
  }

  await page.keyboard.press('ArrowRight');
  await expect(root(page)).toHaveAttribute('data-slide-index', '1');
  await expect(root(page)).toHaveAttribute('data-slide-step', '0');
});

test('ArrowLeft lands on the previous slide fully built', async ({ page }) => {
  await page.keyboard.press('ArrowDown'); // skip to slide 2
  await expect(root(page)).toHaveAttribute('data-slide-index', '1');

  await page.keyboard.press('ArrowLeft');
  await expect(root(page)).toHaveAttribute('data-slide-index', '0');
  await expect(root(page)).toHaveAttribute('data-slide-step', String(FIRST_SLIDE_STEPS));
});

test('Home and End jump to the ends', async ({ page }) => {
  await page.keyboard.press('End');
  await expect(root(page)).toHaveAttribute('data-slide-id', LAST_ID);
  await expect(root(page)).toHaveAttribute('data-slide-index', String(TOTAL - 1));
  await page.keyboard.press('Home');
  await expect(root(page)).toHaveAttribute('data-slide-id', FIRST_ID);
});

test('the URL hash tracks the current slide and step', async ({ page }) => {
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown'); // slide 3 has a build step
  await expect(page).toHaveURL(/#\/3$/);
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/#\/3\/1$/);
});

test('a deep link restores the slide and step', async ({ page }) => {
  await page.goto(DEEP.hash);
  await settle(page);
  await expect(root(page)).toHaveAttribute('data-slide-id', DEEP.id);
  await expect(root(page)).toHaveAttribute('data-slide-step', DEEP.step);
});

test('o toggles the overview and a thumbnail navigates', async ({ page }) => {
  await page.keyboard.press('o');
  await expect(page.locator('.overview')).toBeVisible();
  await expect(page.locator('.overview__cell')).toHaveCount(TOTAL);

  await page
    .locator('.overview__cell')
    .nth(TOTAL - 1)
    .click();
  await expect(page.locator('.overview')).toBeHidden();
  await expect(root(page)).toHaveAttribute('data-slide-id', LAST_ID);
});

test('? toggles the help overlay and Escape closes it', async ({ page }) => {
  await page.keyboard.press('?');
  await expect(page.locator('.help__panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.help__panel')).toBeHidden();
});

test('the stage letterboxes to a 16:9 box', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 1000 });
  const box = await page.locator('.stage-letterbox').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
});

test('the deck walks forward and back through the same states', async ({ page }) => {
  const forward: string[] = [];
  for (let guard = 0; guard < 300; guard++) {
    const at = await position(page);
    forward.push(at);
    await page.keyboard.press('ArrowRight');
    if ((await position(page)) === at) break; // parked on the final state
  }

  expect(forward[0]).toBe('0/0');
  expect(forward.at(-1)).toBe(`${TOTAL - 1}/${LAST_SLIDE_STEPS}`);
  expect(forward).toHaveLength(TOTAL_STATES);
  expect(new Set(forward).size).toBe(forward.length); // no state visited twice

  const backward: string[] = [];
  for (let guard = 0; guard < 300; guard++) {
    const at = await position(page);
    backward.push(at);
    if (at === '0/0') break;
    await page.keyboard.press('ArrowLeft');
  }

  expect(backward).toEqual([...forward].reverse());
});
