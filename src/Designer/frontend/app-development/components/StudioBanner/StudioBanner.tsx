import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref, HTMLAttributes } from 'react';
import classes from './StudioBanner.module.css';

export type StudioBannerProps = {
  title: string;
  description?: string;
  isVisible?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

function StudioBanner(
  {
    title,
    description,
    isVisible = true,
    children,
    actions,
    className,
    ...rest
  }: StudioBannerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement | null {
  if (!isVisible) {
    return null;
  }

  return (
    <div {...rest} className={`${classes.banner} ${className || ''}`} role='dialog' ref={ref}>
      <div className={classes.container}>
        <h2 id='banner-title' className={classes.title}>
          {title}
        </h2>
        {description && <p className={classes.description}>{description}</p>}
        {children && <div className={classes.content}>{children}</div>}
        {actions && <div className={classes.actions}>{actions}</div>}
      </div>
    </div>
  );
}

const ForwardedStudioBanner = forwardRef(StudioBanner);

export { ForwardedStudioBanner as StudioBanner };
