import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  /** Optional leading glyph (usually an `<Icon />`). */
  icon?: ReactNode;
  className?: string;
}

/** Soft rounded label — good for eyebrows, tags and chip rows. */
export function Pill({ children, tone = 'neutral', icon, className }: PillProps) {
  return (
    <span className={['pill', `pill--${tone}`, className].filter(Boolean).join(' ')}>
      {icon && <span className="pill__icon">{icon}</span>}
      {children}
    </span>
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** Dense uppercase status marker. Higher contrast than a Pill. */
export function Badge({ children, tone = 'brand', className }: BadgeProps) {
  return (
    <span className={['badge', `badge--${tone}`, className].filter(Boolean).join(' ')}>
      <span className="badge__dot" aria-hidden />
      {children}
    </span>
  );
}
