import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { ArrowDefs, Dot, Wire } from './_kit';

/**
 * Work that waits for other work: a job started in the background early in the
 * process, which a later step depends on. The example is invented — apps use
 * this today only for events — but the mechanism is the engine's own: a
 * workflow enqueued later declares `dependsOn` on one enqueued earlier, waits
 * until it is done, and carries on by itself.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';

interface Box {
  title: string;
  /** Left edge on the 1656px diagram. */
  x: number;
  /** State at build steps 0…3. */
  states: [Tone, Tone, Tone, Tone];
  /** What `run` means for this box. */
  running: string;
}

const PROCESS: Box[] = [
  { title: 'Utfylling', x: 230, states: ['run', 'ok', 'ok', 'ok'], running: 'Kari er her' },
  { title: 'Bekreftelse', x: 590, states: ['idle', 'run', 'ok', 'ok'], running: 'Kari er her' },
  { title: 'Send inn', x: 950, states: ['idle', 'idle', 'ok', 'ok'], running: 'Kjører' },
  { title: 'Arkivering', x: 1310, states: ['idle', 'idle', 'wait', 'ok'], running: 'Kjører' },
];

const JOB: Box = {
  title: 'Opprett sak i arkivet',
  x: 560,
  states: ['idle', 'run', 'run', 'ok'],
  running: 'Kjører',
};

const STATE_LABEL: Record<Exclude<Tone, 'run'>, string> = {
  ok: 'Fullført',
  wait: 'Venter på saken',
  idle: 'Senere',
};

const CAPTIONS = [
  'Kari fyller ut skjemaet.',
  'Etter første steg starter appen en jobb i bakgrunnen, og Kari går videre.',
  'Arkiveringen trenger saken, så den venter på jobben.',
  'Jobben blir ferdig, og prosessen går videre av seg selv.',
];

const BOX_W = 300;
const BOX_H = 120;
const TOP_Y = 50;
const JOB_Y = 330;
const JOB_W = 560;

function StateLine({ tone, running }: { tone: Tone; running: string }) {
  return (
    <span className={`s-dag__state is-${tone}`}>
      <Dot tone={tone} />
      {tone === 'run' ? running : STATE_LABEL[tone]}
    </span>
  );
}

export default function BakgrunnSlide({ step }: SlideProps) {
  const at = Math.min(Math.max(step, 0), 3);
  const jobShown = at >= 1;

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
          style={{ top: JOB_Y + BOX_H / 2 - 18 }}
          initial={false}
          animate={{ opacity: jobShown ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          I bakgrunnen
        </motion.span>

        <svg className="s-dag__svg" viewBox="0 0 1656 520" width={1656} height={520} aria-hidden>
          <ArrowDefs />
          {PROCESS.slice(0, -1).map((box, i) => (
            <Wire
              key={box.title}
              d={`M${box.x + BOX_W + 4} ${TOP_Y + BOX_H / 2} H ${PROCESS[i + 1].x - 8}`}
              tone="grey"
            />
          ))}
          {/* The branch: the job starts when the first task is done. */}
          <Wire
            d={`M${PROCESS[0].x + BOX_W / 2} ${TOP_Y + BOX_H + 4} V ${JOB_Y + BOX_H / 2} H ${JOB.x - 8}`}
            tone="blue"
            show={jobShown}
          />
          {/* The join: archiving depends on the job. Amber while it waits. */}
          <Wire
            d={`M${JOB.x + JOB_W + 4} ${JOB_Y + BOX_H / 2} H ${PROCESS[3].x + BOX_W / 2} V ${TOP_Y + BOX_H + 8}`}
            tone="amber"
            show={at === 2}
          />
          <Wire
            d={`M${JOB.x + JOB_W + 4} ${JOB_Y + BOX_H / 2} H ${PROCESS[3].x + BOX_W / 2} V ${TOP_Y + BOX_H + 8}`}
            tone="teal"
            show={at === 3}
          />
        </svg>

        {PROCESS.map((box) => (
          <div
            key={box.title}
            className={`s-dag__box is-${box.states[at]}-box`}
            style={{ left: box.x, top: TOP_Y, width: BOX_W, height: BOX_H }}
          >
            <span className="s-dag__title">{box.title}</span>
            <StateLine tone={box.states[at]} running={box.running} />
          </div>
        ))}

        <motion.div
          className={`s-dag__box s-dag__box--job is-${JOB.states[at]}-box`}
          style={{ left: JOB.x, top: JOB_Y, width: JOB_W, height: BOX_H }}
          initial={false}
          animate={{ opacity: jobShown ? 1 : 0, y: jobShown ? 0 : 10 }}
          transition={{ duration: 0.35, delay: jobShown ? 0.25 : 0 }}
        >
          <span className="s-dag__title">{JOB.title}</span>
          <StateLine tone={JOB.states[at]} running={JOB.running} />
        </motion.div>

        <motion.p
          key={at}
          className="s-dag__caption"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {CAPTIONS[at]}
        </motion.p>
      </div>
    </Slide>
  );
}
