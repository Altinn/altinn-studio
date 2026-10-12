import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Icon, Slide } from '../components';
import { ArrowDefs, Dot, Wire } from './_kit';

/**
 * Side work that keeps its own order without holding the user up. Creating the
 * instance starts a Dialogporten job in the background; submitting sends an
 * Altinn Event, which waits until the dialog exists. Events already run as
 * background work today; Dialogporten as an engine side effect is
 * illustrative. The mechanism is the engine's own: a workflow declares
 * `dependsOn` on one enqueued earlier and runs once that one is done.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';
type States = [Tone, Tone, Tone, Tone];

interface Box {
  title: string;
  x: number;
  y: number;
  w: number;
  /** State at build steps 0…3. */
  states: States;
  running: string;
  waiting?: string;
  /** First build step the box is on stage. */
  from?: number;
}

const BOX_H = 120;
const TOP_Y = 50;
const JOB_Y = 330;

const PROCESS: Box[] = [
  { title: 'Opprett instans', x: 230, y: TOP_Y, w: 360, states: ['run', 'ok', 'ok', 'ok'], running: 'Kjører' },
  { title: 'Utfylling', x: 670, y: TOP_Y, w: 360, states: ['idle', 'run', 'ok', 'ok'], running: 'Kari er her' },
  { title: 'Send inn', x: 1110, y: TOP_Y, w: 360, states: ['idle', 'idle', 'ok', 'ok'], running: 'Kjører' },
];

const DIALOG: Box = {
  title: 'Opprett dialog i Dialogporten',
  x: 230,
  y: JOB_Y,
  w: 600,
  states: ['idle', 'run', 'run', 'ok'],
  running: 'Kjører',
  from: 1,
};

const EVENT: Box = {
  title: 'Send Altinn-hendelse',
  x: 1050,
  y: JOB_Y,
  w: 480,
  states: ['idle', 'idle', 'wait', 'ok'],
  running: 'Kjører',
  waiting: 'Venter på dialogen',
  from: 2,
};

const CAPTIONS = [
  'Kari starter et skjema.',
  'Appen oppretter dialogen i bakgrunnen, og Kari fyller ut skjemaet imens.',
  'Kari sender inn og er ferdig. Hendelsen venter til dialogen finnes.',
  'Dialogen er klar, og hendelsen sendes av seg selv.',
];

function label(box: Box, tone: Tone): string {
  if (tone === 'run') return box.running;
  if (tone === 'wait') return box.waiting ?? 'Venter';
  return tone === 'ok' ? 'Fullført' : 'Senere';
}

function BoxView({ box, at }: { box: Box; at: number }) {
  const tone = box.states[at];
  const shown = at >= (box.from ?? 0);
  return (
    <motion.div
      className={`s-dag__box is-${tone}-box`}
      style={{ left: box.x, top: box.y, width: box.w, height: BOX_H }}
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
      transition={{ duration: 0.35, delay: shown && box.from ? 0.25 : 0 }}
    >
      <span className="s-dag__title">{box.title}</span>
      <span className={`s-dag__state is-${tone}`}>
        <Dot tone={tone} />
        {label(box, tone)}
      </span>
    </motion.div>
  );
}

/** A straight drop from the bottom of a process box into the top of its job. */
function drop(box: Box) {
  const x = box.x + box.w / 2;
  return `M${x} ${TOP_Y + BOX_H + 4} V ${JOB_Y - 8}`;
}

export default function BakgrunnSlide({ step }: SlideProps) {
  const at = Math.min(Math.max(step, 0), 3);
  const dependency = `M${DIALOG.x + DIALOG.w + 4} ${JOB_Y + BOX_H / 2} H ${EVENT.x - 8}`;

  return (
    <Slide
      variant="full"
      kicker="Under panseret"
      title="Arbeid i bakgrunnen"
      subtitle="Prosessmotoren vet hva som må vente på hva."
    >
      <div className="s-dag">
        <span className="s-dag__lane" style={{ top: TOP_Y + BOX_H / 2 - 18 }}>
          Prosessen
        </span>
        <motion.span
          className="s-dag__lane"
          style={{ top: JOB_Y + BOX_H / 2 - 40 }}
          initial={false}
          animate={{ opacity: at >= 1 ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          I bakgrunnen
          <span className="s-dag__lane-sub">Av seg selv, og prøves igjen ved feil</span>
        </motion.span>

        {/* Kari's part ends at «Send inn»; everything after it is the platform's. */}
        <motion.span
          className="s-dag__done"
          style={{ left: PROCESS[2].x + PROCESS[2].w / 2 }}
          initial={false}
          animate={{ opacity: at >= 2 ? 1 : 0, y: at >= 2 ? 0 : 8 }}
          transition={{ duration: 0.35, delay: at >= 2 ? 0.15 : 0 }}
        >
          <Icon name="check" size={22} strokeWidth={3} />
          Kari er ferdig
        </motion.span>

        <svg className="s-dag__svg" viewBox="0 0 1656 520" width={1656} height={520} aria-hidden>
          <ArrowDefs />
          {PROCESS.slice(0, -1).map((box, i) => (
            <Wire
              key={box.title}
              d={`M${box.x + box.w + 4} ${TOP_Y + BOX_H / 2} H ${PROCESS[i + 1].x - 8}`}
              tone="grey"
            />
          ))}
          {/* Each side job starts from the process step that sets it off. */}
          <Wire d={drop(PROCESS[0])} tone="blue" show={at >= 1} />
          <Wire d={drop(PROCESS[2])} tone="blue" show={at >= 2} />
          {/* The event depends on the dialog: amber while it waits, green once it may run. */}
          <Wire d={dependency} tone="amber" show={at === 2} />
          <Wire d={dependency} tone="teal" show={at === 3} />
        </svg>

        {PROCESS.map((box) => (
          <BoxView key={box.title} box={box} at={at} />
        ))}
        <BoxView box={DIALOG} at={at} />
        <BoxView box={EVENT} at={at} />

        <motion.p
          key={at}
          className="s-dag__caption"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {CAPTIONS[at]}
        </motion.p>

        <p className="s-dag__footnote">
          Eksempelet viser hvordan vi ser for oss Dialogporten-integrasjonen fremover. Slik fungerer
          det ikke nødvendigvis i dag.
        </p>
      </div>
    </Slide>
  );
}
