import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide, Icon } from '../components';
import type { IconName } from '../components';
import { Backdrop, BrandMark } from './_kit';

/** The ten things one «Send inn» sets off. */
const THINGS: { label: string; icon: IconName }[] = [
  { label: 'Lås instansen', icon: 'lock' },
  { label: 'Valider skjemaet', icon: 'check' },
  { label: 'Avslutt oppgaven', icon: 'flag' },
  { label: 'Lagre skjemadata', icon: 'database' },
  { label: 'Lås datafilene', icon: 'shield' },
  { label: 'Lag PDF', icon: 'document' },
  { label: 'Lagre PDF', icon: 'layers' },
  { label: 'Send forsendelse', icon: 'send' },
  { label: 'Registrer hendelser', icon: 'bell' },
  { label: 'Gå til neste oppgave', icon: 'refresh' },
];

const CHIP_TOP = (i: number) => 4 + i * 70;
const BUTTON_Y = 350;

export default function EttKlikkSlide({ step }: SlideProps) {
  const show = step >= 1;

  return (
    <Slide variant="full">
      <Backdrop />
      <BrandMark place="top" />

      <div className="s-cover">
        <div className="s-cover__col">
          <p className="s-cover__kicker">Altinn-apper · v8 → v9</p>
          <h1 className="s-cover__title">
            Ett klikk,
            <br />
            mange ting
          </h1>
          <p className="s-cover__lead">
            Når en bruker trykker «Send inn», skjer det ti ting. I dag må alle ti lykkes i løpet av
            én forespørsel.
          </p>
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
            </motion.div>
          ))}
        </div>
      </div>
    </Slide>
  );
}
