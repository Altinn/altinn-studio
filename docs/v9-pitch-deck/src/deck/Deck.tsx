import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { SlideDef } from './types';
import type { Direction } from './useDeckNav';
import { Stage } from './Stage';
import { Progress } from './Progress';
import { Overview } from './Overview';
import { Help } from './Help';
import { useDeckNav } from './useDeckNav';
import { useSwipe } from './useSwipe';
import './deck.css';

interface DeckProps {
  slides: SlideDef[];
}

/**
 * Slide-to-slide motion.
 *
 * A short crossfade, not a hand-off: the two slides share one stage cell and
 * overlap, so no frame of the transition has an empty stage. The outgoing slide
 * only fades — it never travels — so the two layers cannot smear past each other
 * into a double image, and it fades out faster than the incoming one arrives, so
 * it is long gone before the new slide settles.
 *
 * Nothing here animates `filter`. A blur over a full 1920x1080 layer
 * re-rasterises every glyph on the canvas twice per transition, which reads as a
 * pop however clean the opacity curve is.
 */
const SLIDE_IN_SECONDS = 0.26;
const SLIDE_OUT_SECONDS = 0.16;

/**
 * Backstop for `data-transitioning`. `onAnimationComplete` clears the flag in the
 * normal case; this only has to cover the ones where it never fires (reduced
 * motion, an interrupted transition). It must stay comfortably LONGER than the
 * enter animation — the old 700 ms backstop was shorter than the old 840 ms
 * transition, so the capture scripts were shooting a moving stage.
 */
const TRANSITION_BACKSTOP_MS = 520;

const slideVariants: Variants = {
  enter: (dir: Direction) => ({ opacity: 0, x: dir * 40 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: SLIDE_IN_SECONDS, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: SLIDE_OUT_SECONDS, ease: 'linear' },
  },
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {});
  } else {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  }
}

export function Deck({ slides }: DeckProps) {
  const nav = useDeckNav(slides);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const { index, step, direction, total, next, prev, nextSlide, prevSlide, goTo, first, last } = nav;

  const closeOverlays = useCallback(() => {
    setOverviewOpen(false);
    setHelpOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'Spacebar':
        case 'PageDown':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prev();
          break;
        case 'ArrowDown':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Home':
          e.preventDefault();
          first();
          break;
        case 'End':
          e.preventDefault();
          last();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          setHelpOpen(false);
          setOverviewOpen((v) => !v);
          break;
        case '?':
          e.preventDefault();
          setOverviewOpen(false);
          setHelpOpen((v) => !v);
          break;
        case 'Escape':
          closeOverlays();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOverlays, first, last, next, nextSlide, prev, prevSlide]);

  const swipe = useSwipe({ onSwipeLeft: next, onSwipeRight: prev });

  // Mark the whole deck as mid-transition so screenshot tooling can wait it out.
  // `onAnimationComplete` clears it early; the timer is a guaranteed backstop.
  //
  // Layout phase on purpose: a passive effect leaves one painted frame that
  // already reports the new slide while still claiming
  // `data-transitioning="false"`, and the capture scripts shoot exactly that.
  useLayoutEffect(() => {
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), TRANSITION_BACKSTOP_MS);
    return () => window.clearTimeout(timer);
  }, [index]);

  const current = slides[index];
  if (!current) {
    return (
      <div className="deck deck--empty">
        <p>No slides registered. Add one in <code>src/slides/index.ts</code>.</p>
      </div>
    );
  }

  const SlideComponent = current.component;

  return (
    <div
      className="deck"
      data-deck-root=""
      data-slide-index={index}
      data-slide-id={current.id}
      data-slide-step={step}
      data-transitioning={transitioning ? 'true' : 'false'}
      {...swipe}
    >
      <Stage>
        {/*
          `mode="sync"`, deliberately. Under `mode="wait"` the deck kept the old
          slide on stage for the whole of its exit before it would even mount the
          new one, so a press left the previous slide up for the best part of
          half a second and the two animations ran end to end. Overlapping them
          in one stage cell is shorter AND gapless — and a burst of presses can
          no longer strand the deck on a stale slide, waiting out an exit that
          keeps being restarted.

          `key` is the slide id, never the step, so a build step re-renders the
          slide in place instead of remounting it.
        */}
        <AnimatePresence mode="sync" custom={direction}>
          <motion.div
            key={current.id}
            className="deck__slide"
            data-slide-layer={current.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === 'center') setTransitioning(false);
            }}
          >
            <SlideComponent step={step} />
          </motion.div>
        </AnimatePresence>
      </Stage>

      <Progress index={index} total={total} step={step} steps={nav.stepsOnCurrent} />

      <button
        type="button"
        className="deck__help-button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

      <Overview
        open={overviewOpen}
        slides={slides}
        index={index}
        onPick={(i) => {
          goTo(i, 0);
          setOverviewOpen(false);
        }}
        onClose={() => setOverviewOpen(false)}
      />

      <Help open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
