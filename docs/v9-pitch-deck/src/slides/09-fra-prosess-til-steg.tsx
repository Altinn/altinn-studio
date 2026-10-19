import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { ArrowDefs, Dot, StepRow, Wire } from './_kit';

/**
 * One app's process, one layer deeper per press: the BPMN as v8 runs it, the
 * PDF as its own service task in v9, the engine's saved steps between two
 * tasks, the PDF step running (and retried) in the engine, and the side effects
 * that leave as their own jobs. The rows follow `WorkflowCommandSet` for the
 * transition into a service task: task end, task start, the commit, then
 * `ExecuteServiceTask`; side effects are enqueued at the commit.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';
/** No status yet: the plain BPMN picture of step 0, and the PDF task new in step 1. */
type BoxTone = Tone | 'plain' | 'new';

const LAST = 4;

/* Process row: the BPMN elements, left to right. */
const ROW_Y = 0;
const ROW_H = 130;
const MID_Y = ROW_Y + ROW_H / 2;
const EVENT_R = 48;
const START_X = 290;
const END_X = 1498;
const FILL = { x: 410, w: 340 };
const PDF = { x: 990, w: 340 };

/* The engine panel the Utfylling → PDF arrow opens into. */
const PANEL = { x: 300, y: 240, w: 600 };
const PANEL_PAD = 18;
const HEAD_H = 30;
const HEAD_GAP = 12;
const ROW_STEP_H = 46;
const ROW_GAP = 8;
const rowCentre = (i: number) =>
  PANEL.y + PANEL_PAD + HEAD_H + HEAD_GAP + i * (ROW_STEP_H + ROW_GAP) + ROW_STEP_H / 2;

/* The side-effect jobs, level with the step that starts them. */
const JOB_H = 120;
const SAVE_ROW = 4;
const PDF_ROW = 5;
const JOB_Y = rowCentre(SAVE_ROW) - JOB_H / 2;

interface EngineStep {
  label: string;
  /** Tone at steps 2…4. */
  tones: [Tone, Tone, Tone];
}

const STEPS: EngineStep[] = [
  { label: 'Avslutt Utfylling', tones: ['ok', 'ok', 'ok'] },
  { label: 'Appens egen kode', tones: ['ok', 'ok', 'ok'] },
  { label: 'Lås svarene', tones: ['ok', 'ok', 'ok'] },
  { label: 'Start Lag PDF', tones: ['ok', 'ok', 'ok'] },
  { label: 'Lagre prosessen', tones: ['ok', 'ok', 'ok'] },
  { label: 'Lag PDF', tones: ['idle', 'wait', 'ok'] },
];

const STATE_TEXT: Record<Tone, string> = {
  ok: 'Fullført',
  run: 'Kjører',
  wait: 'Prøves igjen',
  idle: 'I kø',
};

const SUBTITLES = [
  'Prosessen dere tegner i Studio: utfylling, så slutt.',
  'I v9 blir PDF-en et eget steg i prosessen.',
  'Mellom to steg gjør prosessmotoren jobben, og lagrer hvert steg.',
  'Selve PDF-en lages også av motoren. Feiler den, prøves den igjen.',
  'Det som ikke trenger å vente, kjøres som egne jobber i bakgrunnen.',
];

const fade = (show: boolean, delay = 0) => ({
  initial: false as const,
  animate: { opacity: show ? 1 : 0, y: show ? 0 : 10 },
  transition: { duration: 0.35, delay: show ? delay : 0 },
});

function Task({
  title,
  system,
  x,
  w,
  tone,
  shown = true,
}: {
  title: string;
  system?: string;
  x: number;
  w: number;
  tone: BoxTone;
  shown?: boolean;
}) {
  const status = tone !== 'plain' && tone !== 'new';
  return (
    <motion.div
      className={`s-dag__box is-${tone === 'new' ? 'run' : tone}-box`}
      style={{ left: x, top: ROW_Y, width: w, height: ROW_H }}
      {...fade(shown)}
    >
      {system && <span className='s-dag__system'>{system}</span>}
      <span className='s-dag__title'>{title}</span>
      {status && (
        <span className={`s-dag__state is-${tone}`}>
          <Dot tone={tone} />
          {STATE_TEXT[tone]}
        </span>
      )}
    </motion.div>
  );
}

function Job({
  title,
  x,
  w,
  shown,
  delay,
}: {
  title: string;
  x: number;
  w: number;
  shown: boolean;
  delay: number;
}) {
  return (
    <motion.div
      className='s-dag__box is-ok-box s-flow__job'
      style={{ left: x, top: JOB_Y, width: w, height: JOB_H }}
      {...fade(shown, delay)}
    >
      <span className='s-dag__system'>Altinn Events</span>
      <span className='s-dag__title'>{title}</span>
      <span className='s-dag__state is-ok'>
        <Dot tone='ok' />
        Fullført
      </span>
    </motion.div>
  );
}

export default function FraProsessTilStegSlide({ step }: SlideProps) {
  const at = Math.min(Math.max(step, 0), LAST);
  const v9 = at >= 1;
  const engine = at >= 2;
  const effects = at === LAST;
  const pdfTone: BoxTone =
    at < 2 ? (at === 1 ? 'new' : 'plain') : (['idle', 'wait', 'ok'] as const)[at - 2];

  const fillEnd = FILL.x + FILL.w;
  const pdfEnd = PDF.x + PDF.w;
  const pdfCentre = PDF.x + PDF.w / 2;
  const lens = { x: fillEnd + 12, y: 12, w: PDF.x - fillEnd - 24, h: ROW_H };

  return (
    <Slide
      variant='full'
      kicker='Under panseret'
      title='Fra prosess til steg'
      subtitle={
        <span className='s-leadswap'>
          {SUBTITLES.map((text, i) => (
            <motion.span
              key={text}
              initial={false}
              animate={{ opacity: i === at ? 1 : 0 }}
              transition={{ duration: 0.25, delay: i === at ? 0.1 : 0 }}
              aria-hidden={i !== at}
            >
              {text}
            </motion.span>
          ))}
        </span>
      }
    >
      <div className='s-dag s-flow'>
        <span className='s-dag__lane' style={{ top: MID_Y - 14 }}>
          Prosessen
        </span>
        <motion.span className='s-dag__lane' style={{ top: PANEL.y + PANEL_PAD }} {...fade(engine)}>
          Prosessmotoren
          <span className='s-dag__lane-sub'>Hvert steg lagres og prøves igjen ved feil</span>
        </motion.span>
        <motion.span
          className='s-dag__lane s-flow__lane'
          style={{ top: JOB_Y - 80 }}
          {...fade(effects, 0.2)}
        >
          I bakgrunnen
          <span className='s-dag__lane-sub'>Egne jobber som ikke holder prosessen igjen</span>
        </motion.span>

        <svg className='s-dag__svg' viewBox='0 0 1656 660' width={1656} height={660} aria-hidden>
          <ArrowDefs />
          <Wire d={`M${START_X + EVENT_R + 4} ${MID_Y} H ${FILL.x - 8}`} tone='grey' />
          {/* v8: one arrow straight to the end; the PDF is made inside it. */}
          <Wire d={`M${fillEnd + 4} ${MID_Y} H ${END_X - EVENT_R - 8}`} tone='grey' show={!v9} />
          <Wire
            d={`M${fillEnd + 4} ${MID_Y} H ${PDF.x - 8}`}
            tone={engine ? 'blue' : 'grey'}
            show={v9}
          />
          <Wire d={`M${pdfEnd + 4} ${MID_Y} H ${END_X - EVENT_R - 8}`} tone='grey' show={v9} />

          {/* The arrow opens up into the engine panel. */}
          <motion.g
            initial={false}
            animate={{ opacity: engine ? 1 : 0 }}
            transition={{ duration: 0.35 }}
          >
            <rect
              className='s-flow__window'
              x={lens.x}
              y={lens.y}
              width={lens.w}
              height={lens.h}
              rx={6}
            />
            <path
              className='s-flow__funnel'
              d={`M${lens.x} ${lens.y + lens.h} L ${PANEL.x} ${PANEL.y} M${lens.x + lens.w} ${lens.y + lens.h} L ${PANEL.x + PANEL.w} ${PANEL.y}`}
            />
          </motion.g>

          {/* «Lag PDF» in the engine is the PDF task on the process row. */}
          <Wire
            d={`M${PANEL.x + PANEL.w + 4} ${rowCentre(PDF_ROW)} H ${pdfCentre} V ${ROW_Y + ROW_H + 8}`}
            tone='amber'
            show={at === 3}
          />

          {/* Side effects leave from the saved transition and from the end. */}
          <Wire
            d={`M${PANEL.x + PANEL.w + 4} ${rowCentre(SAVE_ROW)} H ${1000 - 8}`}
            tone='grey'
            show={effects}
          />
          <Wire
            d={`M${END_X} ${MID_Y + EVENT_R + 4} V ${JOB_Y - 8}`}
            tone='grey'
            show={effects}
            delay={0.15}
          />
        </svg>

        <div
          className='s-flow__event'
          style={{
            left: START_X - EVENT_R,
            top: MID_Y - EVENT_R,
            width: EVENT_R * 2,
            height: EVENT_R * 2,
          }}
        >
          Start
        </div>
        <Task title='Utfylling' x={FILL.x} w={FILL.w} tone={engine ? 'ok' : 'plain'} />
        <Task
          title='Lag PDF'
          system='Tjenesteoppgave'
          x={PDF.x}
          w={PDF.w}
          tone={pdfTone}
          shown={v9}
        />
        <div
          className={`s-flow__event s-flow__event--end${effects ? ' is-ok-box' : ''}`}
          style={{
            left: END_X - EVENT_R,
            top: MID_Y - EVENT_R,
            width: EVENT_R * 2,
            height: EVENT_R * 2,
          }}
        >
          Slutt
        </div>

        {/* Steps 0 and 1: where the PDF is made, before and after. */}
        <motion.span
          className='s-flow__note is-v8'
          style={{ left: pdfCentre, top: ROW_H + 30 }}
          initial={false}
          animate={{ opacity: at === 0 ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        >
          v8: PDF-en lages skjult når Utfylling avsluttes
        </motion.span>
        <motion.span
          className='s-flow__note is-v9'
          style={{ left: pdfCentre, top: ROW_H + 30 }}
          initial={false}
          animate={{ opacity: at === 1 ? 1 : 0 }}
          transition={{ duration: 0.25, delay: at === 1 ? 0.1 : 0 }}
        >
          v9: et eget steg, synlig i prosessen
        </motion.span>

        <motion.div
          className='s-db s-flow__panel'
          style={{ left: PANEL.x, top: PANEL.y, width: PANEL.w, padding: PANEL_PAD }}
          {...fade(engine, 0.15)}
        >
          <p className='s-db__head s-flow__head' style={{ height: HEAD_H, marginBottom: HEAD_GAP }}>
            Utfylling → Lag PDF
          </p>
          <div className='s-flow__rows' style={{ gap: ROW_GAP }}>
            {STEPS.map((s, i) => {
              const tone = s.tones[Math.max(at - 2, 0)];
              return (
                <motion.div key={s.label} {...fade(engine, 0.25 + i * 0.06)}>
                  <StepRow label={`${i + 1} · ${s.label}`} state={STATE_TEXT[tone]} tone={tone} />
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <Job title='Nytt steg' x={1000} w={300} shown={effects} delay={0.2} />
        <Job title='Prosessen er ferdig' x={1340} w={316} shown={effects} delay={0.35} />
      </div>
    </Slide>
  );
}
