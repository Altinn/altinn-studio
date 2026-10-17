import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Icon, Slide } from '../components';
import { ArrowDefs, Dot, Wire } from './_kit';

/**
 * Side work that keeps its own order without holding the user up. Creating the
 * instance starts a Dialogporten job in the background; submitting updates the
 * dialog and sends an Altinn Event, and both wait until the dialog exists. Events already run as background work today; Dialogporten
 * as an engine side effect is illustrative. The mechanism is the engine's own: a workflow declares
 * `dependsOn` on one enqueued earlier and runs once that one is done.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';
type States = [Tone, Tone, Tone, Tone];

interface Box {
  /** The system the job talks to, shown above the title. */
  system?: string;
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
const JOB_Y = 300;
const JOB_H = 130;
/** Height of the dependency line that runs under «Oppdater dialogen». */
const UNDER_Y = 475;

const PROCESS: Box[] = [
  { title: 'Opprett instans', x: 230, y: TOP_Y, w: 360, states: ['run', 'ok', 'ok', 'ok'], running: 'Kjører' },
  { title: 'Utfylling', x: 670, y: TOP_Y, w: 360, states: ['idle', 'run', 'ok', 'ok'], running: 'Kari er her' },
  { title: 'Send inn', x: 1110, y: TOP_Y, w: 360, states: ['idle', 'idle', 'ok', 'ok'], running: 'Kjører' },
];

const DIALOG: Box = {
  system: 'Dialogporten',
  title: 'Opprett dialog',
  x: 230,
  y: JOB_Y,
  w: 360,
  states: ['wait', 'run', 'run', 'ok'],
  running: 'Kjører',
  waiting: 'Venter på instansen',
};

const SUBMITTED: Box = {
  system: 'Dialogporten',
  title: 'Oppdater dialogen',
  x: 670,
  y: JOB_Y,
  w: 400,
  states: ['idle', 'idle', 'wait', 'ok'],
  running: 'Kjører',
  waiting: 'Venter på dialogen',
  from: 2,
};

const EVENT: Box = {
  system: 'Altinn Events',
  title: 'Send hendelse',
  x: 1150,
  y: JOB_Y,
  w: 380,
  states: ['idle', 'idle', 'wait', 'ok'],
  running: 'Kjører',
  waiting: 'Venter på dialogen',
  from: 2,
};

const CAPTIONS = [
  'Kari starter et skjema. Dialogen opprettes så snart instansen finnes.',
  'Appen oppretter dialogen i bakgrunnen, og Kari fyller ut skjemaet imens.',
  'Kari sender inn og er ferdig. Resten venter til dialogen finnes.',
  'Dialogen er klar. Nå oppdateres den, og hendelsen går ut av seg selv.',
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
      style={{ left: box.x, top: box.y, width: box.w, height: box.y === JOB_Y ? JOB_H : BOX_H }}
      initial={false}
      animate={{ opacity: shown ? 1 : 0, y: shown ? 0 : 10 }}
      transition={{ duration: 0.35, delay: shown && box.from ? 0.25 : 0 }}
    >
      {box.system && <span className="s-dag__system">{box.system}</span>}
      <span className="s-dag__title">{box.title}</span>
      <span className={`s-dag__state is-${tone}`}>
        <Dot tone={tone} />
        {label(box, tone)}
      </span>
    </motion.div>
  );
}

const centre = (box: Box) => box.x + box.w / 2;

/** A drop from the bottom of a process box into the top of a job it starts. */
function drop(from: Box, to: Box) {
  const fork = (TOP_Y + BOX_H + JOB_Y) / 2;
  return `M${centre(from)} ${TOP_Y + BOX_H + 4} V ${fork} H ${centre(to)} V ${JOB_Y - 8}`;
}

export default function BakgrunnSlide({ step }: SlideProps) {
  const at = Math.min(Math.max(step, 0), 3);
  const dialogDrop = `M${centre(DIALOG)} ${TOP_Y + BOX_H + 4} V ${JOB_Y - 8}`;
  const dependencies = [
    `M${DIALOG.x + DIALOG.w + 4} ${JOB_Y + JOB_H / 2} H ${SUBMITTED.x - 8}`,
    `M${centre(DIALOG)} ${JOB_Y + JOB_H + 4} V ${UNDER_Y} H ${centre(EVENT)} V ${JOB_Y + JOB_H + 8}`,
  ];

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
        <span className="s-dag__lane" style={{ top: JOB_Y + JOB_H / 2 - 40 }}>
          I bakgrunnen
          <span className="s-dag__lane-sub">Av seg selv, og prøves igjen ved feil</span>
        </span>

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
          {/* Every dependency is amber while it waits and grey once it is met. */}
          <Wire d={dialogDrop} tone="amber" show={at === 0} />
          <Wire d={dialogDrop} tone="grey" show={at >= 1} />
          <Wire d={drop(PROCESS[2], SUBMITTED)} tone="grey" show={at >= 2} />
          <Wire d={drop(PROCESS[2], EVENT)} tone="grey" show={at >= 2} />
          {dependencies.map((d) => (
            <g key={d}>
              <Wire d={d} tone="amber" show={at === 2} />
              <Wire d={d} tone="grey" show={at === 3} />
            </g>
          ))}
        </svg>

        {PROCESS.map((box) => (
          <BoxView key={box.title} box={box} at={at} />
        ))}
        <BoxView box={DIALOG} at={at} />
        <BoxView box={SUBMITTED} at={at} />
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
