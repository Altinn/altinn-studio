import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  /** Show the content. Usually `step >= n`. */
  show: boolean;
  children: ReactNode;
  /** Slide-in distance in canvas px. */
  offset?: number;
  /** Direction the content travels in from. */
  from?: 'bottom' | 'top' | 'left' | 'right';
  /** Seconds of delay, for staggering several reveals on one step. */
  delay?: number;
  /** Keep the element in layout while hidden (avoids reflow jumps). */
  keepSpace?: boolean;
  className?: string;
}

const AXIS = {
  bottom: (o: number) => ({ y: o, x: 0 }),
  top: (o: number) => ({ y: -o, x: 0 }),
  left: (o: number) => ({ x: -o, y: 0 }),
  right: (o: number) => ({ x: o, y: 0 }),
};

/**
 * Build-step helper: wrap anything that should appear on a given step.
 *
 * ```tsx
 * <Reveal show={step >= 1}>…</Reveal>
 * ```
 */
export function Reveal({
  show,
  children,
  offset = 26,
  from = 'bottom',
  delay = 0,
  keepSpace = true,
  className,
}: RevealProps) {
  const hidden = { opacity: 0, ...AXIS[from](offset) };
  return (
    <motion.div
      className={className}
      initial={false}
      animate={show ? { opacity: 1, x: 0, y: 0 } : hidden}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      style={keepSpace ? undefined : { display: show ? undefined : 'none' }}
      aria-hidden={!show}
    >
      {children}
    </motion.div>
  );
}
