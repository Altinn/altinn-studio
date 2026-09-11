/**
 * Shared visual primitives for this deck's slides.
 *
 * Nothing here is registered — `index.ts` only imports slide components.
 * Everything is sized in absolute px on the 1920x1080 canvas.
 */
import { Fragment } from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Icon } from '../components';
import type { IconName } from '../components';

/* ---------------------------------------------------------------
   Wires — arrows drawn between absolutely positioned boxes.
   `ArrowDefs` must be rendered once inside the same <svg>.
   --------------------------------------------------------------- */

/** Digdir palette (branding/BRAND.md) — dark enough to read on white. */
const WIRE_COLOURS = {
  blue: '#0062b8',
  amber: '#a56d13',
  red: '#c2132c',
  teal: '#068718',
  grey: '#6b7a8f',
};

type WireTone = keyof typeof WIRE_COLOURS;

export function ArrowDefs() {
  return (
    <defs>
      {(Object.keys(WIRE_COLOURS) as WireTone[]).map((tone) => (
        <marker
          key={tone}
          id={`arw-${tone}`}
          viewBox="0 0 10 10"
          refX="8.5"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill={WIRE_COLOURS[tone]} />
        </marker>
      ))}
    </defs>
  );
}

export function Wire({
  d,
  tone = 'grey',
  show = true,
  delay = 0,
}: {
  d: string;
  tone?: WireTone;
  show?: boolean;
  delay?: number;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={WIRE_COLOURS[tone]}
      strokeWidth={2.5}
      markerEnd={`url(#arw-${tone})`}
      initial={false}
      animate={{ pathLength: show ? 1 : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.45, delay: show ? delay : 0, ease: 'easeOut' }}
    />
  );
}

/* ---------------------------------------------------------------
   Brand geometry — the two shapes the Digdir intro layouts are built
   from: one tilted navy field bleeding off the right edge, and one
   coral circle segment anchored to a corner. Flat, static, no blur.
   Used on the opening and closing slides only.
   --------------------------------------------------------------- */

export function Backdrop({ variant = 'intro' }: { variant?: 'intro' | 'closing' }) {
  return (
    <div className={`s-backdrop s-backdrop--${variant}`} aria-hidden>
      {variant === 'intro' && <div className="s-backdrop__block" />}
      <div className="s-backdrop__disc" />
    </div>
  );
}

/* ---------------------------------------------------------------
   The Digdir wordmark, in the size and position the templates use.
   Intro and closing slides only — content layouts carry no logo.
   --------------------------------------------------------------- */

export function BrandMark({
  place = 'top',
  on = 'light',
}: {
  /** Top-left on light layouts, bottom-left on dark ones — as in the templates. */
  place?: 'top' | 'bottom';
  on?: 'light' | 'dark';
}) {
  return (
    <img
      className={`brandmark brandmark--${place}`}
      src={on === 'dark' ? 'digdir-logo-white.png' : 'digdir-logo.png'}
      width={189}
      height={50}
      alt="Digdir"
    />
  );
}

/* ---------------------------------------------------------------
   The v8 request chain — everything one `process/next` does inline.
   Slides 2, 3 and 4 all draw the same chain in different states.
   --------------------------------------------------------------- */

type NodeState = 'idle' | 'done' | 'ghost' | 'failed';

const CHAIN_NODES: { label: string; icon: IconName }[] = [
  { label: 'Lås instans', icon: 'lock' },
  { label: 'Avslutt oppgave', icon: 'check' },
  { label: 'Lås data', icon: 'shield' },
  { label: 'Lag PDF', icon: 'document' },
  { label: 'Send forsendelse', icon: 'send' },
  { label: 'Registrer hendelser', icon: 'bell' },
  { label: 'Lagre prosessteg', icon: 'database' },
];

interface ChainProps {
  /** One state per node in `CHAIN_NODES`. */
  states?: NodeState[];
  /** Draw the crash bar after this 1-based node index. */
  crashAfter?: number;
  /** Label above the crash bar. */
  crashLabel?: string;
}

function connectorClass(a: NodeState, b: NodeState): string {
  if (a === 'ghost' || b === 'ghost') return 's-conn s-conn--ghost';
  if (a === 'done' && b === 'done') return 's-conn s-conn--done';
  return 's-conn';
}

export function Chain({ states, crashAfter, crashLabel = 'Poden dør' }: ChainProps) {
  const resolved: NodeState[] = CHAIN_NODES.map((_, i) => states?.[i] ?? 'idle');

  return (
    <div className="s-flow">
      {CHAIN_NODES.map((node, i) => {
        const state = resolved[i];
        const next = resolved[i + 1];
        return (
          <Fragment key={node.label}>
            <div className={`s-node${state === 'idle' ? '' : ` s-node--${state}`}`}>
              <span className="s-node__num">{String(i + 1).padStart(2, '0')}</span>
              <Icon name={node.icon} size={38} />
              <span className="s-node__label">{node.label}</span>
              {state === 'done' && (
                <span className="s-node__mark">
                  <Icon name="check" size={22} strokeWidth={2.6} />
                </span>
              )}
              {state === 'failed' && (
                <span className="s-node__mark">
                  <Icon name="x" size={22} strokeWidth={2.6} />
                </span>
              )}
            </div>

            {i < CHAIN_NODES.length - 1 &&
              (crashAfter === i + 1 ? (
                <div className="s-crash">
                  <span className="s-crash__tag">{crashLabel}</span>
                  <span className="s-crash__bar" />
                </div>
              ) : (
                <span className={connectorClass(state, next)} />
              ))}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   Small shared bits
   --------------------------------------------------------------- */

/** The dashed "one HTTP request" bubble the v8 chain lives inside. */
export function RequestBubble({
  label,
  quiet = false,
  children,
}: {
  label: ReactNode;
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`s-bubble${quiet ? ' s-bubble--quiet' : ''}`}>
      <p className="s-bubble__label">{label}</p>
      {children}
    </div>
  );
}

/**
 * Frame for the three simulation slides: a small title chip over an
 * almost-full-bleed stage that the simulation fills on its own.
 */
export function SimFrame({
  no,
  title,
  children,
}: {
  no: ReactNode;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="s-simchip">
        <span className="s-simchip__no">{no}</span>
        <span className="s-simchip__title">{title}</span>
      </div>
      <div className="s-simstage">{children}</div>
    </>
  );
}

/** Status dot. `tone` maps to the `is-*` colour classes. */
export function Dot({ tone }: { tone: 'ok' | 'run' | 'wait' | 'bad' | 'idle' }) {
  return <span className={`s-dot is-${tone}`} aria-hidden />;
}

/** A single row in the "steps in Postgres" panel. */
export function StepRow({
  label,
  state,
  tone,
}: {
  label: ReactNode;
  state: ReactNode;
  tone: 'ok' | 'run' | 'wait' | 'bad' | 'idle';
}) {
  return (
    <div className="s-steprow">
      <Dot tone={tone} />
      <span>{label}</span>
      <span className={`s-steprow__state is-${tone}`}>{state}</span>
    </div>
  );
}
