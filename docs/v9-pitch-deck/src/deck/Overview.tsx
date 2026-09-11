import { AnimatePresence, motion } from 'framer-motion';
import type { SlideDef } from './types';
import { ThumbStage } from './Stage';

interface OverviewProps {
  open: boolean;
  slides: SlideDef[];
  index: number;
  onPick: (index: number) => void;
  onClose: () => void;
}

/**
 * Sized so a full deck fits a 1080p window without scrolling — the presenter
 * hits `o` to jump, and a grid that needs a scroll to reach the last slide is
 * a grid they cannot use. Keep it in step with `--overview-thumb` in deck.css.
 */
const THUMB_WIDTH = 288;

/** Grid of live slide thumbnails. Toggled with `o`. */
export function Overview({ open, slides, index, onPick, onClose }: OverviewProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <div className="overview__inner" onClick={(e) => e.stopPropagation()}>
            <header className="overview__header">
              <h2 className="overview__title">Overview</h2>
              <p className="overview__hint">
                Click a slide, or press <kbd>O</kbd> / <kbd>Esc</kbd> to close
              </p>
            </header>

            <ul className="overview__grid">
              {slides.map((slide, i) => {
                const SlideComponent = slide.component;
                return (
                  <li key={slide.id}>
                    <button
                      type="button"
                      className={`overview__cell${i === index ? ' is-current' : ''}`}
                      onClick={() => onPick(i)}
                      title={slide.notes ?? slide.id}
                    >
                      <div className="overview__thumb">
                        <ThumbStage width={THUMB_WIDTH}>
                          <SlideComponent step={slide.steps ?? 0} />
                        </ThumbStage>
                      </div>
                      <span className="overview__label">
                        <span className="overview__num">{String(i + 1).padStart(2, '0')}</span>
                        <span className="overview__id">{slide.id}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
