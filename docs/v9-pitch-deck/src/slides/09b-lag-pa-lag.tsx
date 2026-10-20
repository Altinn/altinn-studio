import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Slide } from '../components';
import { ArrowDefs, Dot, Wire } from './_kit';

/**
 * The BPMN process is the backbone, and every press adds a lane under it,
 * column for column: v8's picture, the PDF as a service task, the engine's
 * steps under every transition, the side effects that leave as their own jobs,
 * then one failure that retries only the step that failed. The engine rows
 * follow `WorkflowCommandSet`: task end, task start, the commit, then the
 * post-commit work; side effects are enqueued at the commit.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';

const LAST = 5;

/* The process row. Arrows are long so that each transition gets a column. */
const ROW_H = 120;
const MID_Y = ROW_H / 2;
const EVENT_R = 40;
const START_CX = 260;
const END_CX = 1550;
const BOX_W = 230;
const FILL_X = 550;
const PDF_X = 1030;

/* Engine and background lanes. */
const ENGINE_Y = 170;
const BG_Y = 470;
const CHIP_H = 40;
const CHIP_GAP = 8;
const chipTop = (laneY: number, row: number) => laneY + row * (CHIP_H + CHIP_GAP);

interface Column {
  key: string;
  centre: number;
  width: number;
}

const COLS = {
  start: { key: 'start', centre: (START_CX + EVENT_R + FILL_X) / 2, width: 240 },
  fill: { key: 'fill', centre: (FILL_X + BOX_W + PDF_X) / 2, width: 240 },
  pdf: { key: 'pdf', centre: PDF_X + BOX_W / 2, width: 220 },
  end: { key: 'end', centre: (PDF_X + BOX_W + END_CX - EVENT_R) / 2, width: 240 },
} satisfies Record<string, Column>;

interface Chip {
  col: Column;
  row: number;
  label: string;
  /** Tone at steps 2…5. */
  tones: [Tone, Tone, Tone, Tone];
}

const DONE: Chip['tones'] = ['ok', 'ok', 'ok', 'ok'];
const LATER: Chip['tones'] = ['idle', 'idle', 'idle', 'ok'];

const ENGINE: Chip[] = [
  { col: COLS.start, row: 0, label: 'Start Utfylling', tones: DONE },
  { col: COLS.start, row: 1, label: 'Forhåndsutfyll', tones: DONE },
  { col: COLS.start, row: 2, label: 'Appens egen kode', tones: DONE },
  { col: COLS.start, row: 3, label: 'Lagre', tones: DONE },
  { col: COLS.fill, row: 0, label: 'Avslutt Utfylling', tones: DONE },
  { col: COLS.fill, row: 1, label: 'Appens egen kode', tones: DONE },
  { col: COLS.fill, row: 2, label: 'Lås svarene', tones: DONE },
  { col: COLS.fill, row: 3, label: 'Start Lag PDF', tones: DONE },
  { col: COLS.fill, row: 4, label: 'Lagre', tones: DONE },
  { col: COLS.pdf, row: 0, label: 'Lag PDF', tones: ['run', 'run', 'wait', 'ok'] },
  { col: COLS.end, row: 0, label: 'Avslutt Lag PDF', tones: LATER },
  { col: COLS.end, row: 1, label: 'Lagre', tones: LATER },
  { col: COLS.end, row: 2, label: 'Appens egen kode', tones: LATER },
];

const BACKGROUND: Chip[] = [
  { col: COLS.start, row: 0, label: 'Hendelse: opprettet', tones: DONE },
  { col: COLS.start, row: 1, label: 'Hendelse: nytt steg', tones: DONE },
  { col: COLS.fill, row: 0, label: 'Hendelse: nytt steg', tones: DONE },
  { col: COLS.end, row: 0, label: 'Hendelse: ferdig', tones: LATER },
];

/** The chips are narrow, so a state is a mark; the subtitle says what it means. */
const STATE_MARK: Record<Tone, string> = {
  ok: '✓',
  run: '…',
  wait: '↻',
  idle: '',
};

const SUBTITLES = [
  'Slik tegner dere prosessen i Studio: utfylling, så slutt.',
  'I v9 blir PDF-en et eget steg i prosessen.',
  'Mellom hvert steg i prosessen gjør prosessmotoren jobben.',
  'Det som ikke trenger å vente, går som egne jobber i bakgrunnen.',
  'Feiler PDF-en, prøves bare den igjen. Det som er fullført, står.',
  'PDF-en er laget, og prosessen går videre til slutt av seg selv.',
];

/** Steps 0 and 1 show the process row alone, larger and in the middle. */
const CAMERA = {
  close: { scale: 1.1, y: 40 },
  wide: { scale: 1, y: 0 },
};

const fade = (show: boolean, delay = 0) => ({
  initial: false as const,
  animate: { opacity: show ? 1 : 0, y: show ? 0 : 8 },
  transition: { duration: 0.3, delay: show ? delay : 0 },
});

function ChipView({
  chip,
  laneY,
  at,
  shown,
  delay,
  background,
}: {
  chip: Chip;
  laneY: number;
  at: number;
  shown: boolean;
  delay: number;
  background?: boolean;
}) {
  const tone = chip.tones[Math.max(at - 2, 0)];
  return (
    <motion.div
      className={`s-layer__chip is-${tone}-chip${background ? ' s-layer__chip--bg' : ''}`}
      style={{
        left: chip.col.centre - chip.col.width / 2,
        top: chipTop(laneY, chip.row),
        width: chip.col.width,
        height: CHIP_H,
      }}
      {...fade(shown, delay)}
    >
      <Dot tone={tone} />
      <span className='s-layer__label'>{chip.label}</span>
      <span className={`s-layer__state is-${tone}`}>{STATE_MARK[tone]}</span>
    </motion.div>
  );
}

export default function LagPaLagSlide({ step }: SlideProps) {
  const at = Math.min(Math.max(step, 0), LAST);
  const v9 = at >= 1;
  const engine = at >= 2;
  const background = at >= 3;
  const pdfTone: Tone | 'plain' = at < 2 ? 'plain' : ENGINE[9].tones[at - 2];
  const fillDone = engine;
  const ended = at === LAST;

  const columnBottom = (chips: Chip[], col: Column, laneY: number) =>
    chipTop(laneY, Math.max(...chips.filter((c) => c.col === col).map((c) => c.row))) + CHIP_H;

  return (
    <Slide
      variant='full'
      kicker='Under panseret'
      title='Lag på lag'
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
      <div className='s-dag s-layer'>
        <motion.div
          className='s-layer__camera'
          style={{ transformOrigin: `${(START_CX + END_CX) / 2}px ${MID_Y}px` }}
          initial={false}
          animate={engine ? CAMERA.wide : CAMERA.close}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span className='s-dag__lane' style={{ top: MID_Y - 14 }} {...fade(engine)}>
            Prosessen
          </motion.span>
          <motion.span className='s-dag__lane' style={{ top: ENGINE_Y }} {...fade(engine, 0.1)}>
            Prosessmotoren
            <span className='s-dag__lane-sub'>Mellom hvert steg, og lagret underveis</span>
          </motion.span>
          <motion.span className='s-dag__lane' style={{ top: BG_Y }} {...fade(background, 0.1)}>
            I bakgrunnen
            <span className='s-dag__lane-sub'>Egne jobber som ikke holder prosessen igjen</span>
          </motion.span>

          <svg className='s-dag__svg' viewBox='0 0 1656 660' width={1656} height={660} aria-hidden>
            <ArrowDefs />
            <Wire d={`M${START_CX + EVENT_R + 4} ${MID_Y} H ${FILL_X - 8}`} tone='grey' />
            {/* v8: straight from Utfylling to the end; the PDF is made inside the arrow. */}
            <Wire
              d={`M${FILL_X + BOX_W + 4} ${MID_Y} H ${END_CX - EVENT_R - 8}`}
              tone='grey'
              show={!v9}
            />
            <Wire d={`M${FILL_X + BOX_W + 4} ${MID_Y} H ${PDF_X - 8}`} tone='grey' show={v9} />
            <Wire
              d={`M${PDF_X + BOX_W + 4} ${MID_Y} H ${END_CX - EVENT_R - 8}`}
              tone='grey'
              show={v9}
            />

            {/* Each transition, and the service task, drops into its own column. */}
            {[COLS.start, COLS.fill, COLS.end].map((col, i) => (
              <motion.line
                key={col.key}
                className='s-layer__drop'
                x1={col.centre}
                y1={MID_Y + 8}
                x2={col.centre}
                y2={ENGINE_Y - 10}
                initial={false}
                animate={{ opacity: engine ? 1 : 0 }}
                transition={{ duration: 0.3, delay: engine ? 0.1 + i * 0.1 : 0 }}
              />
            ))}
            <motion.line
              className='s-layer__drop'
              x1={COLS.pdf.centre}
              y1={ROW_H + 4}
              x2={COLS.pdf.centre}
              y2={ENGINE_Y - 10}
              initial={false}
              animate={{ opacity: engine ? 1 : 0 }}
              transition={{ duration: 0.3, delay: engine ? 0.2 : 0 }}
            />

            {/* Side effects leave once a transition is saved. */}
            {[COLS.start, COLS.fill, COLS.end].map((col, i) => (
              <Wire
                key={col.key}
                d={`M${col.centre} ${columnBottom(ENGINE, col, ENGINE_Y) + 4} V ${BG_Y - 10}`}
                tone='grey'
                show={background}
                delay={0.1 + i * 0.1}
              />
            ))}
          </svg>

          <div
            className='s-flow__event'
            style={{
              left: START_CX - EVENT_R,
              top: MID_Y - EVENT_R,
              width: EVENT_R * 2,
              height: EVENT_R * 2,
            }}
          >
            Start
          </div>
          <div
            className={`s-dag__box is-${fillDone ? 'ok' : 'plain'}-box`}
            style={{ left: FILL_X, top: 0, width: BOX_W, height: ROW_H }}
          >
            <span className='s-dag__title'>Utfylling</span>
          </div>
          <motion.div
            className={`s-dag__box is-${pdfTone === 'plain' ? (v9 ? 'run' : 'plain') : `${pdfTone}`}-box`}
            style={{ left: PDF_X, top: 0, width: BOX_W, height: ROW_H }}
            {...fade(v9)}
          >
            <span className='s-dag__system'>Tjenesteoppgave</span>
            <span className='s-dag__title'>Lag PDF</span>
          </motion.div>
          <div
            className={`s-flow__event s-flow__event--end${ended ? ' is-ok-box' : ''}`}
            style={{
              left: END_CX - EVENT_R,
              top: MID_Y - EVENT_R,
              width: EVENT_R * 2,
              height: EVENT_R * 2,
            }}
          >
            Slutt
          </div>

          <motion.span
            className='s-flow__note is-v8'
            style={{ left: COLS.pdf.centre, top: ROW_H + 24 }}
            initial={false}
            animate={{ opacity: at === 0 ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          >
            v8: PDF-en lages skjult i overgangen
          </motion.span>
          <motion.span
            className='s-flow__note is-v9'
            style={{ left: COLS.pdf.centre, top: ROW_H + 24 }}
            initial={false}
            animate={{ opacity: at === 1 ? 1 : 0 }}
            transition={{ duration: 0.25, delay: at === 1 ? 0.1 : 0 }}
          >
            v9: et eget steg i prosessen
          </motion.span>

          {ENGINE.map((chip, i) => (
            <ChipView
              key={`${chip.col.key}-${chip.row}`}
              chip={chip}
              laneY={ENGINE_Y}
              at={at}
              shown={engine}
              delay={0.25 + i * 0.04}
            />
          ))}
          {BACKGROUND.map((chip, i) => (
            <ChipView
              key={`bg-${chip.col.key}-${chip.row}`}
              chip={chip}
              laneY={BG_Y}
              at={at}
              shown={background}
              delay={0.3 + i * 0.08}
              background
            />
          ))}
        </motion.div>
      </div>
    </Slide>
  );
}
