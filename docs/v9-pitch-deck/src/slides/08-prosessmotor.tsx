import { motion } from 'framer-motion';
import type { SlideProps } from '../deck';
import { Icon, Slide } from '../components';
import { ArrowDefs, Enter, StepRow, Wire } from './_kit';

/**
 * The backend part's lead slide. It opens on the whole idea in one picture
 * (the app, the process engine, the saved steps), then turns into one app's
 * BPMN process, and every press adds to the lanes under it: v8's picture, the
 * PDF as a service task, then Kari's way through, column
 * by column (the engine starting Utfylling, the app answering while she fills
 * it in, the engine ending it and running the PDF task), the side effects that
 * leave as their own jobs, and one failure that retries only the step that
 * failed. The engine rows
 * follow `WorkflowCommandSet`: task end, task start, the commit, then the
 * post-commit work; side effects are enqueued at the commit.
 */

type Tone = 'ok' | 'run' | 'wait' | 'idle';

const LAST = 7;

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
  app: { key: 'app', centre: FILL_X + BOX_W / 2, width: 220 },
  fill: { key: 'fill', centre: (FILL_X + BOX_W + PDF_X) / 2, width: 240 },
  pdf: { key: 'pdf', centre: PDF_X + BOX_W / 2, width: 220 },
  end: { key: 'end', centre: (PDF_X + BOX_W + END_CX - EVENT_R) / 2, width: 240 },
} satisfies Record<string, Column>;

interface Chip {
  col: Column;
  row: number;
  label: string;
  /** First build step the chip is on stage. */
  from: number;
  /** Tone at steps 2…7. */
  tones: [Tone, Tone, Tone, Tone, Tone, Tone];
}

const DONE: Chip['tones'] = ['ok', 'ok', 'ok', 'ok', 'ok', 'ok'];
const LATER: Chip['tones'] = ['idle', 'idle', 'idle', 'idle', 'idle', 'ok'];
/** Kari is filling in the form at step 3, and has sent it from step 4. */
const FILLING: Chip['tones'] = ['run', 'run', 'ok', 'ok', 'ok', 'ok'];
/** The PDF step runs, fails and is retried, then succeeds; the task box follows it. */
const PDF_TONES: Chip['tones'] = ['idle', 'idle', 'run', 'run', 'wait', 'ok'];

/** Steps 2, 3 and 4 follow Kari: into Utfylling, filling it in, and sending it. */
const ARRIVE = 2;
const FILL = 3;
const SEND = 4;
const EFFECTS = 5;

const ENGINE: Chip[] = [
  { col: COLS.start, row: 0, from: ARRIVE, label: 'Start Utfylling', tones: DONE },
  { col: COLS.start, row: 1, from: ARRIVE, label: 'Forhåndsutfyll', tones: DONE },
  { col: COLS.start, row: 2, from: ARRIVE, label: 'Appens egen kode', tones: DONE },
  { col: COLS.start, row: 3, from: ARRIVE, label: 'Lagre', tones: DONE },
  { col: COLS.fill, row: 0, from: SEND, label: 'Avslutt Utfylling', tones: DONE },
  { col: COLS.fill, row: 1, from: SEND, label: 'Appens egen kode', tones: DONE },
  { col: COLS.fill, row: 2, from: SEND, label: 'Lås svarene', tones: DONE },
  { col: COLS.fill, row: 3, from: SEND, label: 'Lagre', tones: DONE },
  { col: COLS.pdf, row: 0, from: SEND, label: 'Sjekk oppsettet', tones: DONE },
  { col: COLS.pdf, row: 1, from: SEND, label: 'Lag PDF', tones: PDF_TONES },
  { col: COLS.end, row: 0, from: SEND, label: 'Avslutt Lag PDF', tones: LATER },
  { col: COLS.end, row: 1, from: SEND, label: 'Lagre', tones: LATER },
  { col: COLS.end, row: 2, from: SEND, label: 'Appens egen kode', tones: LATER },
];

/** Not the engine: while Kari fills in the form, the app answers her requests itself. */
const APP: Chip[] = [
  { col: COLS.app, row: 0, from: FILL, label: 'Validering', tones: FILLING },
  { col: COLS.app, row: 1, from: FILL, label: 'Beregninger', tones: FILLING },
  { col: COLS.app, row: 2, from: FILL, label: 'Lagres underveis', tones: FILLING },
];

const BACKGROUND: Chip[] = [
  { col: COLS.start, row: 0, from: EFFECTS, label: 'Hendelse: opprettet', tones: DONE },
  { col: COLS.start, row: 1, from: EFFECTS, label: 'Hendelse: nytt steg', tones: DONE },
  { col: COLS.fill, row: 0, from: EFFECTS, label: 'Hendelse: nytt steg', tones: DONE },
  { col: COLS.end, row: 0, from: EFFECTS, label: 'Hendelse: ferdig', tones: LATER },
];

/** The chips are narrow, so a state is a mark alone; the subtitle says what it means. */
const STATE_MARK: Record<Tone, string> = {
  ok: '✓',
  run: '…',
  wait: '↻',
  idle: '',
};

/** One per build step: the intro, then the layered diagram's steps. */
const SUBTITLES = [
  'Appen sier hva som skal skje. Prosessmotoren sørger for at det blir gjort.',
  'Slik tegner dere prosessen i Studio: utfylling, så slutt.',
  'I v9 blir PDF-en et eget steg i prosessen.',
  'Mellom hvert steg i prosessen gjør prosessmotoren jobben.',
  'Mens Kari fyller ut, svarer appen selv, akkurat som i dag.',
  'Kari sender inn. Motoren avslutter steget og lager PDF-en.',
  'Det som ikke trenger å vente, går som egne jobber i bakgrunnen.',
  'Feiler PDF-en, prøves bare den igjen. Det som er fullført, står.',
  'PDF-en er laget, og prosessen går videre til slutt av seg selv.',
];

/**
 * Where the instance is at steps 2…7, shown above the process row: the place
 * it is at, what is happening there, and how it is going.
 */
const STATUS: { x: number; text: string; tone: Tone }[] = [
  { x: COLS.start.centre, text: 'Kari åpner skjemaet', tone: 'run' },
  { x: COLS.app.centre, text: 'Kari fyller ut', tone: 'run' },
  { x: COLS.fill.centre, text: 'Kari sender inn', tone: 'run' },
  { x: COLS.pdf.centre, text: 'PDF-en lages', tone: 'run' },
  { x: COLS.pdf.centre, text: 'PDF-tjenesten svarer ikke', tone: 'wait' },
  { x: END_CX, text: 'Ferdig', tone: 'ok' },
];
const STATUS_Y = -56;

/**
 * Steps 0 and 1 show the process row alone, larger; from step 2 the row sits
 * low enough to leave room for the status above it.
 */
const CAMERA = {
  close: { scale: 1.1, y: 40 },
  wide: { scale: 1, y: 60 },
};
const EASE = [0.22, 1, 0.36, 1] as const;
const CAMERA_MOVE = { duration: 0.6, ease: EASE };

/** Where the app box sits in the intro, in the body's coordinates. */
const APP_BOX = { left: 0, top: 160, width: 360, height: 240 };
/** The band the app box becomes, around the process row, in the camera's coordinates. */
const BAND = { x0: START_CX - EVENT_R - 50, x1: END_CX + EVENT_R + 50, y0: -22, y1: ROW_H + 10 };

/** The band's rectangle in the body's coordinates, under a camera position. */
function bandRect(camera: { scale: number; y: number }) {
  const originX = (START_CX + END_CX) / 2;
  const x = (v: number) => originX + (v - originX) * camera.scale;
  const y = (v: number) => MID_Y + (v - MID_Y) * camera.scale + camera.y;
  return {
    left: x(BAND.x0),
    top: y(BAND.y0),
    width: x(BAND.x1) - x(BAND.x0),
    height: y(BAND.y1) - y(BAND.y0),
  };
}

/**
 * The intro's app box, which carries the picture into the process: on the first
 * press it grows into the band the process row sits in, since the process is
 * what the app says should happen, and the band follows the camera from there.
 */
function AppBand({ view, wide }: { view: number; wide: boolean }) {
  const band = view > 0;
  const rect = !band ? APP_BOX : bandRect(wide ? CAMERA.wide : CAMERA.close);
  return (
    <motion.div
      className={`s-unit s-unit--app s-engine__app${band ? ' is-band' : ''}`}
      initial={{ opacity: 0, y: 16, ...rect }}
      animate={{ opacity: 1, y: 0, ...rect }}
      transition={{
        // The rectangle moves exactly like the camera, so the band stays locked to the process row.
        // Growing out of the intro waits for the other tiles to clear; shrinking back waits for
        // the process to fade out of the band first.
        default: !band
          ? { ...CAMERA_MOVE, delay: 0.3 }
          : view === 1
            ? { ...CAMERA_MOVE, delay: 0.15 }
            : CAMERA_MOVE,
        opacity: { duration: 0.4, delay: 0.12 },
        y: { duration: 0.4, delay: 0.12, ease: EASE },
      }}
    >
      <motion.span
        className='s-engine__app-body'
        initial={false}
        animate={
          band
            ? { opacity: 0, transitionEnd: { visibility: 'hidden' } }
            : { opacity: 1, visibility: 'visible' }
        }
        transition={{ duration: band ? 0.12 : 0.3, delay: band ? 0 : 0.75 }}
      >
        <Icon name='user' size={44} />
        <span className='s-unit__title'>Altinn-app</span>
        <span className='s-unit__sub'>Skjema, oppgaver og logikk</span>
      </motion.span>
      <motion.span
        className='s-engine__app-label'
        initial={false}
        animate={{ opacity: band ? 1 : 0 }}
        transition={{ duration: band ? 0.3 : 0.2, delay: band ? 0.4 : 0 }}
      >
        Altinn-app
      </motion.span>
    </motion.div>
  );
}

const fade = (show: boolean, delay = 0) => ({
  initial: false as const,
  animate: { opacity: show ? 1 : 0, y: show ? 0 : 8 },
  transition: { duration: 0.3, delay: show ? delay : 0 },
});

function ChipView({
  chip,
  laneY,
  at,
  delay,
  kind,
}: {
  chip: Chip;
  laneY: number;
  at: number;
  delay: number;
  kind?: 'app' | 'bg';
}) {
  const tone = chip.tones[Math.max(at - 2, 0)];
  return (
    <motion.div
      className={`s-layer__chip is-${tone}-chip${kind ? ` s-layer__chip--${kind}` : ''}`}
      style={{
        left: chip.col.centre - chip.col.width / 2,
        top: chipTop(laneY, chip.row),
        width: chip.col.width,
        height: CHIP_H,
      }}
      {...fade(at >= chip.from, delay)}
    >
      <span className='s-layer__label'>{chip.label}</span>
      <span className={`s-layer__state is-${tone}`}>{STATE_MARK[tone]}</span>
    </motion.div>
  );
}

/**
 * Step 0: the app says what should happen, the engine sees that it is done, step by step.
 * The app box itself is `AppBand`, which outlives the intro.
 */
function EngineIntro() {
  return (
    <div className='s-arch'>
      <Enter index={1}>
        <svg className='s-arch__svg' viewBox='0 0 1656 520' width={1656} height={520} aria-hidden>
          <ArrowDefs />
          <Wire d='M360 240 H 652' tone='blue' />
          <Wire d='M660 340 H 368' tone='teal' />
          <Wire d='M1060 260 H 1192' tone='teal' />
        </svg>
        <span
          className='s-arrowlabel'
          style={{ left: 510, top: 186, transform: 'translateX(-50%)' }}
        >
          Hva som skal skje
        </span>
        <span
          className='s-arrowlabel'
          style={{ left: 510, top: 286, transform: 'translateX(-50%)' }}
        >
          Gjør steget
        </span>
      </Enter>

      <Enter index={1}>
        <div
          className='s-unit s-unit--engine'
          style={{ left: 660, top: 160, width: 400, height: 240 }}
        >
          <Icon name='server' size={44} />
          <span className='s-unit__title'>Prosessmotor</span>
          <span className='s-unit__sub'>Holder orden på stegene</span>
        </div>
      </Enter>

      <Enter index={2}>
        <div className='s-db' style={{ left: 1200, top: 96, width: 456 }}>
          <p className='s-db__head'>
            <Icon name='database' size={24} />
            Lagrede steg
          </p>
          <StepRow label='1 · Avslutt oppgaven' state='Fullført' tone='ok' />
          <StepRow label='2 · Lag PDF' state='Fullført' tone='ok' />
          <StepRow label='3 · Send til mottaker' state='Kjører' tone='run' />
          <StepRow label='4 · Varsle andre systemer' state='I kø' tone='idle' />
        </div>
      </Enter>
    </div>
  );
}

export default function ProsessmotorSlide({ step }: SlideProps) {
  const view = Math.min(Math.max(step, 0), LAST + 1);
  const intro = view === 0;
  // The layered diagram's own step: 0 for the plain v8 process, which it also shows behind the intro.
  const at = Math.max(view - 1, 0);
  const v9 = at >= 1;
  const engine = at >= ARRIVE;
  const background = at >= EFFECTS;
  const sent = at >= SEND;
  const fillTone = !engine ? 'plain' : sent ? 'ok' : 'run';
  const pdfTone = !v9 ? 'plain' : at === 1 ? 'run' : !sent ? 'plain' : PDF_TONES[at - 2];
  const ended = at === LAST;
  const status = STATUS[Math.max(at - ARRIVE, 0)];

  const columnBottom = (chips: Chip[], col: Column, laneY: number) =>
    chipTop(laneY, Math.max(...chips.filter((c) => c.col === col).map((c) => c.row))) + CHIP_H;

  return (
    <Slide
      variant='full'
      kicker='Bak kulissene'
      title='En motor for prosessene'
      subtitle={
        <span className='s-leadswap'>
          {SUBTITLES.map((text, i) => (
            <motion.span
              key={text}
              initial={false}
              animate={{ opacity: i === view ? 1 : 0 }}
              transition={{ duration: 0.25, delay: i === view ? 0.1 : 0 }}
              aria-hidden={i !== view}
            >
              {text}
            </motion.span>
          ))}
        </span>
      }
    >
      {/*
        The intro and the layered diagram share the body. On the first press the
        other tiles clear out quickly, then the app box, alone in motion, grows
        into the process row's band; the process appears once the band has
        grown, and leaves before it shrinks back.
      */}
      <div className='s-engine'>
        <AppBand view={view} wide={engine} />
        <motion.div
          className='s-layer__intro'
          initial={false}
          animate={{ opacity: intro ? 1 : 0, scale: intro ? 1 : 0.98 }}
          transition={{ duration: intro ? 0.35 : 0.15, delay: intro ? 0.6 : 0 }}
          aria-hidden={!intro}
        >
          <EngineIntro />
        </motion.div>
        <motion.div
          className='s-dag s-layer'
          initial={false}
          animate={{ opacity: intro ? 0 : 1 }}
          transition={{ duration: 0.35, delay: intro ? 0 : 0.55 }}
          aria-hidden={intro}
        >
          <motion.div
            className='s-layer__camera'
            style={{ transformOrigin: `${(START_CX + END_CX) / 2}px ${MID_Y}px` }}
            initial={false}
            animate={engine ? CAMERA.wide : CAMERA.close}
            transition={CAMERA_MOVE}
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

            {/* The status rides above the process row to wherever the instance is. */}
            <motion.div
              className={`s-layer__status is-${status.tone}-chip`}
              style={{ left: 0, top: STATUS_Y }}
              initial={false}
              animate={{ x: status.x, opacity: engine ? 1 : 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={`s-layer__state is-${status.tone}`}>{STATE_MARK[status.tone]}</span>
              {status.text}
            </motion.div>

            <svg
              className='s-dag__svg'
              viewBox='0 0 1656 600'
              width={1656}
              height={600}
              aria-hidden
            >
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

              {/* Each transition, Utfylling and the service task drop into their own column. */}
              {(
                [
                  [COLS.start, MID_Y + 8, ARRIVE],
                  [COLS.app, ROW_H + 4, FILL],
                  [COLS.fill, MID_Y + 8, SEND],
                  [COLS.pdf, ROW_H + 4, SEND],
                  [COLS.end, MID_Y + 8, SEND],
                ] as const
              ).map(([col, top, from], i) => (
                <motion.line
                  key={col.key}
                  className={`s-layer__drop${col === COLS.app ? ' s-layer__drop--app' : ''}`}
                  x1={col.centre}
                  y1={top}
                  x2={col.centre}
                  y2={ENGINE_Y - 10}
                  initial={false}
                  animate={{ opacity: at >= from ? 1 : 0 }}
                  transition={{ duration: 0.3, delay: at >= from ? 0.1 + (i % 3) * 0.1 : 0 }}
                />
              ))}

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
              className={`s-layer__event${engine ? ' is-ok-box' : ''}`}
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
              className={`s-dag__box is-${fillTone}-box`}
              style={{ left: FILL_X, top: 0, width: BOX_W, height: ROW_H }}
            >
              <span className='s-dag__title'>Utfylling</span>
            </div>
            <motion.div
              className={`s-dag__box is-${pdfTone}-box`}
              style={{ left: PDF_X, top: 0, width: BOX_W, height: ROW_H }}
              {...fade(v9)}
            >
              <span className='s-dag__system'>Tjenesteoppgave</span>
              <span className='s-dag__title'>Lag PDF</span>
            </motion.div>
            <div
              className={`s-layer__event s-layer__event--end${ended ? ' is-ok-box' : ''}`}
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
              className='s-layer__note is-v8'
              style={{ left: COLS.pdf.centre, top: ROW_H + 24 }}
              initial={false}
              animate={{ opacity: at === 0 ? 1 : 0 }}
              transition={{ duration: 0.25 }}
            >
              v8: PDF-en lages skjult i overgangen
            </motion.span>
            <motion.span
              className='s-layer__note is-v9'
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
                delay={0.25 + (i % 5) * 0.05}
              />
            ))}
            {APP.map((chip, i) => (
              <ChipView
                key={`app-${chip.row}`}
                chip={chip}
                laneY={ENGINE_Y}
                at={at}
                delay={0.25 + i * 0.06}
                kind='app'
              />
            ))}
            {BACKGROUND.map((chip, i) => (
              <ChipView
                key={`bg-${chip.col.key}-${chip.row}`}
                chip={chip}
                laneY={BG_Y}
                at={at}
                delay={0.3 + i * 0.08}
                kind='bg'
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </Slide>
  );
}
