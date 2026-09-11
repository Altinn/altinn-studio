import type { CSSProperties, ReactNode } from 'react';
import type { Tone } from './Pill';

interface CardProps {
  children?: ReactNode;
  title?: ReactNode;
  /** Small line above the title. */
  eyebrow?: ReactNode;
  /** Usually an `<Icon />`. Rendered in a tinted square. */
  icon?: ReactNode;
  tone?: Tone;
  /** `solid` = filled surface, `outline` = hairline only, `glass` = blurred. */
  fill?: 'solid' | 'outline' | 'glass';
  /** Dim the card — useful for "before" columns and inactive build steps. */
  muted?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** Content container used across the deck. */
export function Card({
  children,
  title,
  eyebrow,
  icon,
  tone = 'neutral',
  fill = 'solid',
  muted = false,
  className,
  style,
}: CardProps) {
  return (
    <div
      className={[
        'card',
        `card--${fill}`,
        `card--tone-${tone}`,
        muted ? 'is-muted' : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      {(icon || eyebrow || title) && (
        <div className="card__head">
          {icon && <span className="card__icon">{icon}</span>}
          <div className="card__headings">
            {eyebrow && <p className="card__eyebrow">{eyebrow}</p>}
            {title && <h3 className="card__title">{title}</h3>}
          </div>
        </div>
      )}
      {children && <div className="card__body">{children}</div>}
    </div>
  );
}
