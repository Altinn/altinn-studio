import type { CSSProperties, ReactNode } from 'react';

export type SlideVariant = 'title' | 'split' | 'center' | 'full';

export interface SlideLayoutProps {
  /** Layout preset. */
  variant?: SlideVariant;
  /** Small eyebrow line above the title. */
  kicker?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Body slot. For `split`, direct children become the two columns. */
  children?: ReactNode;
  /** `split` only — grid template for the two columns. */
  splitRatio?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Layout wrapper every slide should sit inside. Fills the full 1920x1080
 * canvas and owns the outer padding, so slide bodies never repeat it.
 */
export function Slide({
  variant = 'full',
  kicker,
  title,
  subtitle,
  children,
  splitRatio = '1fr 1fr',
  className,
  style,
}: SlideLayoutProps) {
  const hasHeader = Boolean(kicker || title || subtitle);

  return (
    <section
      className={['slide', `slide--${variant}`, className].filter(Boolean).join(' ')}
      style={style}
      data-variant={variant}
    >
      {hasHeader && (
        <header className="slide__header">
          {kicker && <p className="slide__kicker">{kicker}</p>}
          {title && <h1 className="slide__title">{title}</h1>}
          {subtitle && <p className="slide__subtitle">{subtitle}</p>}
        </header>
      )}

      {children && (
        <div
          className="slide__body"
          style={variant === 'split' ? ({ gridTemplateColumns: splitRatio } as CSSProperties) : undefined}
        >
          {children}
        </div>
      )}
    </section>
  );
}
