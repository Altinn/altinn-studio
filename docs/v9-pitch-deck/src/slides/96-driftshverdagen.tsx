import type { SlideProps } from '../deck';
import { Slide, Reveal } from '../components';

const LOG: { text: string; tone?: 'warn' | 'err' }[] = [
  { text: '11:04:21  info   ProcessEngine       Next(Task_2 -> Task_3) instance 4f2a…' },
  { text: '11:04:22  info   EndTaskEventHandler PDF stored (412 kB)' },
  { text: '11:04:23  warn   EventDispatcher     Could not register cloud event', tone: 'warn' },
  { text: '11:04:23  error  EndTaskEventHandler 503 from downstream, unlocking data', tone: 'err' },
  { text: '11:04:23  error  ProcessController   500 Internal Server Error', tone: 'err' },
  { text: '11:04:41  info   ProcessEngine       Next(Task_2 -> Task_3) instance 9c17…' },
  { text: '11:04:44  warn   InstanceLocker      Lease held, 409 Conflict', tone: 'warn' },
  { text: '11:05:02  info   EndTaskEventHandler PDF stored (388 kB)' },
  { text: '11:05:09  error  EFormidlingService  Request timed out', tone: 'err' },
  { text: '11:05:10  info   ProcessEngine       Next(Task_1 -> Task_2) instance 22be…' },
  { text: '11:05:12  warn   EventDispatcher     Could not register cloud event', tone: 'warn' },
];

/** Slide 7 — what operations has to work with today. */
export default function DriftshverdagenSlide({ step }: SlideProps) {
  return (
    <Slide
      variant="split"
      splitRatio="940px 668px"
      kicker="I dag · v8"
      title="Driftshverdagen"
      subtitle="I dag må noen lete i loggene for å svare."
    >
      <div className="s-logwall">
        <div className="s-logwall__bar">
          <span />
          <span />
          <span />
        </div>
        {LOG.map((line) => (
          <p key={line.text} className={`s-logline${line.tone ? ` s-logline--${line.tone}` : ''}`}>
            {line.text}
          </p>
        ))}
      </div>

      <div className="s-fill" style={{ gap: 'var(--sp-4)', justifyContent: 'flex-start' }}>
        <p className="s-qmark">?</p>
        <Reveal show={step >= 1}>
          <p className="s-question">Hvor mange instanser står fast akkurat nå?</p>
        </Reveal>
        <Reveal show={step >= 2}>
          <p className="s-question">Hvorfor?</p>
        </Reveal>
      </div>
    </Slide>
  );
}
