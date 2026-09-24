import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide, Icon } from '../components';
import type { IconName } from '../components';
import { Backdrop } from './_kit';

/**
 * The ten things one «Send inn» sets off — the bridge into the scenarios.
 * Step 1 fans them out; step 2 marks every one of them as saved, which is
 * the whole v9 promise in one picture.
 */
const THINGS: { label: string; icon: IconName }[] = [
  { label: 'Hindre dobbel innsending', icon: 'lock' },
  { label: 'Sjekk skjemaet', icon: 'check' },
  { label: 'Avslutt steget', icon: 'flag' },
  { label: 'Lagre svarene', icon: 'database' },
  { label: 'Lås svarene', icon: 'shield' },
  { label: 'Lag PDF', icon: 'document' },
  { label: 'Lagre PDF-en', icon: 'layers' },
  { label: 'Send til mottaker', icon: 'send' },
  { label: 'Varsle andre systemer', icon: 'bell' },
  { label: 'Gå videre i prosessen', icon: 'refresh' },
];

const CHIP_TOP = (i: number) => 4 + i * 70;
const BUTTON_Y = 350;

export default function EttKlikkSlide({ step }: SlideProps) {
  const show = step >= 1;
  const saved = step >= 2;

  return (
    <Slide variant="full">
      <Backdrop />

      <div className="s-cover">
        <div className="s-cover__col">
          <p className="s-cover__kicker">Backend</p>
          <h1 className="s-cover__title">
            Ett klikk,
            <br />
            ti ting
          </h1>
          {/* Both leads share one grid cell, so swapping them never moves the title. */}
          <div className="s-leadswap">
            <motion.p
              className="s-cover__lead"
              initial={false}
              animate={{ opacity: saved ? 0 : 1 }}
              transition={{ duration: 0.25 }}
              aria-hidden={saved}
            >
              Når en bruker trykker «Send inn», skjer alt dette. I v8 må alt lykkes mens brukeren
              venter.
            </motion.p>
            <motion.p
              className="s-cover__lead"
              initial={false}
              animate={{ opacity: saved ? 1 : 0 }}
              transition={{ duration: 0.25, delay: saved ? 0.1 : 0 }}
              aria-hidden={!saved}
            >
              I v9 blir hver av dem lagret og gjort ferdig — også når noe feiler underveis.
            </motion.p>
          </div>
        </div>

        <div className="s-fan">
          <svg className="s-fan__svg" viewBox="0 0 820 700" width={820} height={700} aria-hidden>
            {THINGS.map((thing, i) => {
              const y = CHIP_TOP(i) + 27;
              return (
                <motion.path
                  key={thing.label}
                  d={`M300 ${BUTTON_Y} C 366 ${BUTTON_Y}, 374 ${y}, 440 ${y}`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.55)"
                  strokeWidth={1.6}
                  initial={false}
                  animate={{ pathLength: show ? 1 : 0, opacity: show ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: show ? i * 0.02 : 0, ease: 'easeOut' }}
                />
              );
            })}
          </svg>

          <div className="s-fan__btn">Send inn</div>

          {THINGS.map((thing, i) => (
            <motion.div
              key={thing.label}
              className="s-fan__chip"
              style={{ top: CHIP_TOP(i) }}
              initial={false}
              animate={{ opacity: show ? 1 : 0, x: show ? 0 : -24 }}
              transition={{ duration: 0.3, delay: show ? 0.08 + i * 0.02 : 0, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon name={thing.icon} size={26} />
              {thing.label}
              <motion.span
                className="s-fan__saved"
                initial={false}
                animate={{ opacity: saved ? 1 : 0, scale: saved ? 1 : 0.6 }}
                transition={{ duration: 0.25, delay: saved ? i * 0.04 : 0, ease: 'easeOut' }}
              >
                <Icon name="check" size={20} strokeWidth={3} />
              </motion.span>
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  );
}
