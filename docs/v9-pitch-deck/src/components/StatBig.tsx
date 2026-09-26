import type { ReactNode } from 'react';
import type { Tone } from './Pill';

interface StatBigProps {
  /** The number itself. Keep it short — it renders at 150px. */
  value: ReactNode;
  /** Unit or symbol trailing the value (`%`, `x`, `ms`). */
  suffix?: ReactNode;
  /** Symbol leading the value (`+`, `−`, `~`). */
  prefix?: ReactNode;
  label: ReactNode;
  /** Small supporting line under the label. */
  caption?: ReactNode;
  tone?: Tone;
  align?: 'start' | 'center';
  className?: string;
}

/** Oversized number with a label. The deck's headline metric primitive. */
export function StatBig({
  value,
  suffix,
  prefix,
  label,
  caption,
  tone = 'accent',
  align = 'center',
  className,
}: StatBigProps) {
  return (
    <div
      className={['stat', `stat--${tone}`, `stat--align-${align}`, className]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="stat__value">
        {prefix && <span className="stat__affix stat__affix--prefix">{prefix}</span>}
        <span className="stat__number">{value}</span>
        {suffix && <span className="stat__affix stat__affix--suffix">{suffix}</span>}
      </div>
      <p className="stat__label">{label}</p>
      {caption && <p className="stat__caption">{caption}</p>}
    </div>
  );
}
