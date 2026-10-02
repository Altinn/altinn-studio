import { motion } from 'framer-motion';

interface ProgressProps {
  index: number;
  total: number;
  step: number;
  steps: number;
}

/** Thin progress bar pinned to the bottom of the viewport, plus a slide counter. */
export function Progress({ index, total, step, steps }: ProgressProps) {
  // Count build steps as fractional slide progress so the bar always moves.
  const withinSlide = steps > 0 ? step / (steps + 1) : 0;
  const pct = total > 1 ? ((index + withinSlide) / (total - 1)) * 100 : 100;

  return (
    <div className="deck-progress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={total}>
      <motion.div
        className="deck-progress__fill"
        animate={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
        // A tween on the same curve and length as the slide crossfade, so the
        // chrome lands with the stage. The old spring was still settling long
        // after the slide had, which left the bottom edge of the screen moving
        // under a slide that was already still.
        transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      />
      <div className="deck-progress__count">
        <span className="deck-progress__count-current">{String(index + 1).padStart(2, '0')}</span>
        <span className="deck-progress__count-sep">/</span>
        <span className="deck-progress__count-total">{String(total).padStart(2, '0')}</span>
      </div>
    </div>
  );
}
