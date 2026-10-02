import { AcceleratedAnimation } from 'framer-motion';

/**
 * Stop framer-motion handing `opacity` / `filter` / `transform` to the Web
 * Animations API, because in framer-motion 11 that path flashes one frame of the
 * WRONG value at the end of every animation.
 *
 * The bug, in the library's own code
 * (`animation/animators/AcceleratedAnimation.mjs`):
 *
 * ```js
 * animation.onfinish = () => {
 *   motionValue.set(getFinalKeyframe(...));  // batched — lands NEXT frame
 *   onComplete && onComplete();
 *   this.cancel();                           // synchronous — effect gone NOW
 * };
 * ```
 *
 * While a WAAPI animation runs, framer never writes the animated value into the
 * element's inline `style`; the inline style still holds the value the animation
 * STARTED from. `cancel()` removes the WAAPI effect immediately, but the
 * `motionValue.set()` that would write the final value is batched into
 * framer's next render tick. For exactly one frame the element therefore renders
 * its stale inline style:
 *
 * - a slide leaving the stage snaps back to `opacity: 1` — the old slide
 *   reappearing "for a fraction of a second";
 * - a slide or a `<Reveal>` arriving snaps back to `opacity: 0` just as it lands
 *   — the "flickering element", which is why it depended on what was animating.
 *
 * `AcceleratedAnimation.supports()` is the gate that picks the animator, and it
 * is part of framer-motion's public export surface. Forcing it to `false` puts
 * every value on `MainThreadAnimation`, which writes through the motion value —
 * and therefore into the inline style — on every frame including the last one.
 * There is no stale style left to fall back to, so the flash cannot happen.
 *
 * The deck is a dozen animated elements on one canvas, so giving up compositor
 * offload costs nothing measurable; `.deck__slide` is promoted to its own layer
 * in `deck.css` so the crossfade still composites cheaply.
 *
 * Call this once, before the first render. Revisit it when framer-motion is
 * upgraded: if the upstream `onfinish` commits the final style synchronously,
 * this whole module can go.
 */
let installed = false;

/** `supports` is declared as a type predicate, which a plain `false` cannot be. */
const neverAccelerate = () => false as const;

export function disableAcceleratedAnimations(): void {
  if (installed) return;
  installed = true;
  AcceleratedAnimation.supports =
    neverAccelerate as unknown as typeof AcceleratedAnimation.supports;
}
