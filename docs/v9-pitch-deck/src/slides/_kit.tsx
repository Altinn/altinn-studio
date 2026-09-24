/**
 * Shared visual primitives for this deck's slides.
 *
 * Nothing here is registered — `index.ts` only imports slide components.
 * Everything is sized in absolute px on the 1920x1080 canvas.
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Icon, Slide } from '../components';
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
   Small shared bits
   --------------------------------------------------------------- */

/** Status dot. `tone` maps to the `is-*` colour classes. */
export function Dot({ tone }: { tone: 'ok' | 'run' | 'wait' | 'bad' | 'idle' }) {
  return <span className={`s-dot is-${tone}`} aria-hidden />;
}

/** A single row in a list of saved steps. */
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

/* ---------------------------------------------------------------
   Feature cards — the grid the section slides are built from.
   --------------------------------------------------------------- */

export interface Feature {
  icon: IconName;
  /** Small caps line above the title: the area, in one word. */
  eyebrow: string;
  title: string;
  body: string;
}

/**
 * Entrance for a group of tiles: each one fades and rises in as the slide
 * arrives, `index` steps of 70 ms after the first. Not a build step — the
 * tiles are all there without a click.
 */
export function Enter({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Three or four cards in a row, entering together with a short stagger. */
export function FeatureGrid({
  features,
  tone = 'run',
}: {
  features: readonly Feature[];
  tone?: 'run' | 'ok';
}) {
  return (
    <div className={`s-fcards s-fcards--${features.length}`}>
      {features.map((f, i) => (
        <Enter key={f.title} index={i}>
          <div className={`s-fcard s-fcard--feature is-${tone}`}>
            <span className="s-fcard__icon">
              <Icon name={f.icon} size={36} />
            </span>
            <p className="s-fcard__status">{f.eyebrow}</p>
            <h3 className="s-fcard__title">{f.title}</h3>
            <p className="s-fcard__body">{f.body}</p>
          </div>
        </Enter>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------
   Section divider — one per part of the talk.
   --------------------------------------------------------------- */

export function SectionSlide({
  no,
  title,
  lead,
}: {
  no: ReactNode;
  title: ReactNode;
  lead: ReactNode;
}) {
  return (
    <Slide variant="full">
      <Backdrop variant="closing" />
      <div className="s-section">
        <p className="s-section__no">{no}</p>
        <h1 className="s-section__title">{title}</h1>
        <p className="s-section__lead">{lead}</p>
      </div>
    </Slide>
  );
}
