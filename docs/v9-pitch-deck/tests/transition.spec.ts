import { test, expect, type Page } from '@playwright/test';

/**
 * Transition suite — the frame-by-frame one.
 *
 * The deck used to flicker: framer-motion ran `opacity` through the Web
 * Animations API and, at the end of every animation, left one frame showing the
 * value the animation had STARTED from. On stage that was the old slide blinking
 * back at full strength halfway through a change, and every `<Reveal>` blinking
 * out again just as it landed. Neither is visible to an ordinary assertion —
 * they last one frame and everything is correct again by the next one — so this
 * suite samples `requestAnimationFrame` and reads the whole curve.
 *
 * The invariants it holds the transition to:
 *   1. the stage is never empty — no gap between the slides;
 *   2. the outgoing slide only ever gets fainter, and is gone before the new one
 *      has settled;
 *   3. the incoming slide starts from nothing and only ever gets stronger;
 *   4. nothing inside a slide reverses for a single frame;
 *   5. the whole thing is over inside 350 ms;
 *   6. a build step re-renders the slide rather than remounting it.
 */

/** Effective ink on screen once the layers are composited over each other. */
const MIN_COVERAGE = 0.85;
const MAX_TRANSITION_MS = 350;
/** A one-frame reversal bigger than this is a flash, not easing noise. */
const FLASH_DELTA = 0.2;

interface Layer {
  id: string | null;
  op: number;
  /** Opacity of every animated element inside this slide, in DOM order. */
  reveals: number[];
}

interface Frame {
  t: number;
  layers: Layer[];
}

interface Recording {
  frames: Frame[];
  /**
   * The opacity each slide layer had at the instant it entered the DOM, read
   * from a MutationObserver rather than from a sampled frame. A layer that
   * enters at anything but 0 was painted before its entry animation applied —
   * which is a flash of a fully-formed slide, however briefly.
   */
  insertions: { id: string | null; op: number }[];
}

const root = (page: Page) => page.locator('[data-deck-root]');

/**
 * Wait the way a presenter does: let the deck report itself settled, then stand
 * on the slide a moment before pressing again. Acting the instant the flag flips
 * measures a deck that is still finishing its previous move, and framer-motion
 * takes a different (non-accelerated, and so non-flashing) path for an animation
 * started that soon after a mount — which quietly hides the very defect this
 * suite exists to catch.
 */
const DWELL_MS = 600;

async function settle(page: Page) {
  await expect(root(page)).toHaveAttribute('data-transitioning', 'false');
  await page.waitForTimeout(DWELL_MS);
}

/** Record every animation frame while `act` runs, plus `tailMs` afterwards. */
async function record(page: Page, act: () => Promise<void>, tailMs = 900): Promise<Recording> {
  await page.evaluate(() => {
    const w = window as unknown as {
      __frames: unknown[];
      __insertions: unknown[];
      __recording: boolean;
      __observer?: MutationObserver;
    };
    w.__frames = [];
    w.__insertions = [];
    w.__recording = true;

    w.__observer?.disconnect();
    w.__observer = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of r.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains('deck__slide')) continue;
          w.__insertions.push({
            id: node.getAttribute('data-slide-layer'),
            op: Number(getComputedStyle(node).opacity),
          });
        }
      }
    });
    const stage = document.querySelector('.stage-canvas');
    if (stage) w.__observer.observe(stage, { childList: true });

    const tick = () => {
      if (!w.__recording) return;
      w.__frames.push({
        t: performance.now(),
        layers: [...document.querySelectorAll('.deck__slide')].map((el) => ({
          id: el.getAttribute('data-slide-layer'),
          op: Number(getComputedStyle(el).opacity),
          reveals: [...el.querySelectorAll<HTMLElement>('[style*="opacity"]')].map((child) =>
            Number(getComputedStyle(child).opacity),
          ),
        })),
      });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await act();
  await page.waitForTimeout(tailMs);

  return page.evaluate(() => {
    const w = window as unknown as {
      __frames: Frame[];
      __insertions: Recording['insertions'];
      __recording: boolean;
      __observer?: MutationObserver;
    };
    w.__recording = false;
    w.__observer?.disconnect();
    return { frames: w.__frames, insertions: w.__insertions };
  });
}

/** Alpha-composite the layers: 0 is a blank stage, 1 is fully covered. */
const coverage = (frame: Frame) => 1 - frame.layers.reduce((acc, l) => acc * (1 - l.op), 1);

/** Every frame in which `id` was on stage, in order. */
const framesOf = (frames: Frame[], id: string) =>
  frames.flatMap((f) => {
    const layer = f.layers.find((l) => l.id === id);
    return layer ? [{ t: f.t, layer }] : [];
  });

/**
 * One-frame reversals inside a single slide: a value that jumps and immediately
 * jumps back. Elements are tracked by DOM position, which is stable for the life
 * of one layer.
 */
function findFlashes(tracks: number[][]): string[] {
  const flashes: string[] = [];
  const width = Math.max(0, ...tracks.map((t) => t.length));
  for (let el = 0; el < width; el++) {
    const series = tracks.map((t) => t[el]).filter((v): v is number => v !== undefined);
    for (let i = 1; i < series.length - 1; i++) {
      const [a, b, c] = [series[i - 1]!, series[i]!, series[i + 1]!];
      const dip = a - b > FLASH_DELTA && c - b > FLASH_DELTA;
      const spike = b - a > FLASH_DELTA && b - c > FLASH_DELTA;
      if (dip || spike) flashes.push(`element ${el} at frame ${i}: ${a} -> ${b} -> ${c}`);
    }
  }
  return flashes;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(root(page)).toBeVisible();
  await settle(page);
});

test('a slide change crossfades without a gap, a ghost or a flash', async ({ page }) => {
  const from = (await root(page).getAttribute('data-slide-id'))!;
  const { frames, insertions } = await record(page, () => page.keyboard.press('ArrowDown'));
  await settle(page);
  const to = (await root(page).getAttribute('data-slide-id'))!;

  expect(from).not.toBe(to);
  expect(frames.length).toBeGreaterThan(20);

  // 1. The stage is never empty — no blank gap between the two slides.
  expect(
    Math.min(...frames.map(coverage)),
    'the stage went blank mid-transition',
  ).toBeGreaterThan(MIN_COVERAGE);

  const outgoing = framesOf(frames, from);
  const incoming = framesOf(frames, to);
  expect(outgoing.length).toBeGreaterThan(3);
  expect(incoming.length).toBeGreaterThan(3);

  // 2. The old slide only ever gets fainter. One frame of it coming back is
  //    exactly the "old page showing for a fraction of a second" defect.
  for (let i = 1; i < outgoing.length; i++) {
    expect(
      outgoing[i]!.layer.op,
      `outgoing slide brightened (${outgoing[i - 1]!.layer.op} -> ${outgoing[i]!.layer.op})`,
    ).toBeLessThanOrEqual(outgoing[i - 1]!.layer.op + 0.001);
  }

  // 3. The new slide starts from nothing and only ever gets stronger. The
  //    starting point comes from the MutationObserver, not from a sampled frame:
  //    on a loaded machine the first frame can already be well into the fade.
  const inserted = insertions.find((i) => i.id === to);
  expect(inserted, 'the new slide layer was never observed entering the DOM').toBeTruthy();
  expect(inserted!.op, 'the new slide was painted before its entry state applied').toBeLessThan(
    0.05,
  );
  for (let i = 1; i < incoming.length; i++) {
    expect(
      incoming[i]!.layer.op,
      `incoming slide dimmed (${incoming[i - 1]!.layer.op} -> ${incoming[i]!.layer.op})`,
    ).toBeGreaterThanOrEqual(incoming[i - 1]!.layer.op - 0.001);
  }

  // 4. The old slide is off the stage before the new one finishes arriving.
  const arrived = incoming.find((f) => f.layer.op >= 0.999);
  expect(arrived, 'the new slide never reached full opacity').toBeTruthy();
  expect(
    outgoing.at(-1)!.t,
    'the old slide was still on stage after the new one had settled',
  ).toBeLessThan(arrived!.t);

  // 5. Short enough to keep up with a presenter. Nothing can be measured finer
  //    than it is sampled, so the widest gap between two frames is allowed on
  //    top — under parallel workers that gap can be much longer than 1/60 s.
  const gaps = frames.slice(1).map((f, i) => f.t - frames[i]!.t);
  const slack = Math.max(...gaps);
  expect(arrived!.t - incoming[0]!.t).toBeLessThanOrEqual(MAX_TRANSITION_MS + slack);

  // 6. Nothing inside the arriving slide pops: its step-0 content fades in with
  //    the slide rather than blinking on after it.
  const flashes = findFlashes(incoming.map((f) => f.layer.reveals));
  expect(flashes, `arriving slide blinked: ${flashes.join(' | ')}`).toEqual([]);
});

test('build-step content lands without blinking out', async ({ page }) => {
  await page.goto('/#/6'); // `halvveis` — one card revealed per build step
  await settle(page);
  const id = (await root(page).getAttribute('data-slide-id'))!;

  const { frames } = await record(page, () => page.keyboard.press('ArrowRight'));
  await expect(root(page)).toHaveAttribute('data-slide-step', '1');

  const tracks = framesOf(frames, id).map((f) => f.layer.reveals);
  // Prove the check ran. An empty sample — a slide that was never found, or one
  // where nothing moved — would otherwise pass this test without checking a
  // thing, which is the failure mode a flicker suite can least afford.
  expect(tracks.length, 'never sampled the slide').toBeGreaterThan(20);
  const moved = tracks[0]!.some((op, i) => Math.abs((tracks.at(-1)![i] ?? op) - op) > 0.5);
  expect(moved, 'nothing on the slide animated, so nothing was checked').toBe(true);

  const flashes = findFlashes(tracks);
  expect(flashes, `a reveal blinked as it landed: ${flashes.join(' | ')}`).toEqual([]);
});

test('five presses in one second leave a settled, correct stage', async ({ page }) => {
  const { frames } = await record(page, async () => {
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(120);
    }
  });

  expect(
    Math.min(...frames.map(coverage)),
    'the stage went blank under rapid presses',
  ).toBeGreaterThan(MIN_COVERAGE);

  await settle(page);
  // Slide 1 has 1 build step and slide 2 has 2, so five presses land on slide 3.
  await expect(root(page)).toHaveAttribute('data-slide-index', '2');
  await expect(root(page)).toHaveAttribute('data-slide-step', '0');

  // Exactly one layer left, and it is the slide the deck claims to be on.
  const layers = page.locator('.deck__slide');
  await expect(layers).toHaveCount(1);
  await expect(layers).toHaveAttribute(
    'data-slide-layer',
    (await root(page).getAttribute('data-slide-id'))!,
  );
});

test('keyboard repeat never strands the deck on a stale slide', async ({ page }) => {
  // Faster than a human can click and faster than the transition is long: every
  // press must still register, and the deck must still settle on the right one.
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');

  await settle(page);
  const layers = page.locator('.deck__slide');
  await expect(layers).toHaveCount(1);
  await expect(layers).toHaveAttribute(
    'data-slide-layer',
    (await root(page).getAttribute('data-slide-id'))!,
  );
  // Slides 1-3 hold 1 + 2 + 2 build steps, so the eighth press opens slide 4.
  // Anything short of that means presses were swallowed.
  await expect(root(page)).toHaveAttribute('data-slide-index', '3');
  await expect(root(page)).toHaveAttribute('data-slide-step', '0');
});

test('a build step re-renders the slide instead of remounting it', async ({ page }) => {
  const stamp = () =>
    page.evaluate(() => {
      const el = document.querySelector('.deck__slide') as
        | (HTMLElement & { __mark?: number })
        | null;
      if (!el) return null;
      el.__mark ??= Math.random();
      return el.__mark;
    });

  const before = await stamp();
  expect(before).not.toBeNull();

  await page.keyboard.press('ArrowRight'); // build step, same slide
  await expect(root(page)).toHaveAttribute('data-slide-step', '1');
  expect(await stamp(), 'the slide remounted on a build step').toBe(before);

  await page.keyboard.press('ArrowRight'); // now the slide really does change
  await settle(page);
  expect(await stamp(), 'the slide did not remount on a slide change').not.toBe(before);
});
