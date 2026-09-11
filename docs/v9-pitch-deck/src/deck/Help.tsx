import { AnimatePresence, motion } from 'framer-motion';

interface HelpProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS: Array<[string[], string]> = [
  [['→', 'Space', 'PgDn'], 'Next build step, then next slide'],
  [['←', 'PgUp'], 'Previous build step, then previous slide'],
  [['↓'], 'Skip to next slide (ignore build steps)'],
  [['↑'], 'Skip to previous slide'],
  [['Home'], 'First slide'],
  [['End'], 'Last slide'],
  [['F'], 'Toggle fullscreen'],
  [['O'], 'Toggle overview grid'],
  [['?'], 'Toggle this help'],
  [['Esc'], 'Close overlay / leave fullscreen'],
  [['Swipe'], 'Swipe left / right on touch devices'],
  // On the three simulation slides `Space` belongs to the scene, not the deck
  // (src/sims/parts/useScenario.ts takes it in the capture phase), so the sheet
  // has to say so — otherwise it contradicts the row above it, and the run sheet.
  [['Space', 'R'], 'On a simulation: pause / resume, and replay'],
];

/** Keyboard cheat sheet. Toggled with `?`. */
export function Help({ open, onClose }: HelpProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="help"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
        >
          <motion.div
            className="help__panel"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="help__title">Keyboard shortcuts</h2>
            <dl className="help__list">
              {SHORTCUTS.map(([keys, label]) => (
                <div className="help__row" key={label}>
                  <dt className="help__keys">
                    {keys.map((k) => (
                      <kbd key={k}>{k}</kbd>
                    ))}
                  </dt>
                  <dd className="help__label">{label}</dd>
                </div>
              ))}
            </dl>
            <p className="help__foot">
              Deep-link a slide with <code>#/3</code>, or a build step with <code>#/3/2</code>.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
