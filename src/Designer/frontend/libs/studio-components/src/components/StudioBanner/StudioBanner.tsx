import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref, HTMLAttributes } from 'react';
import { StudioHeading } from '../StudioHeading';
import { StudioParagraph } from '../StudioParagraph';
import cn from 'classnames';
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
    className: givenClassName,
    ...rest
  }: StudioBannerProps,
  ref: Ref<HTMLDivElement>,
): ReactElement | null {
  if (!isVisible) {
    return null;
  }

  const classNames: string = cn(classes.banner, givenClassName);

  return (
    <div {...rest} className={classNames} role='dialog' ref={ref}>
      <div className={classes.container}>
        <StudioHeading level={2} className={classes.title}>
          {title}
        </StudioHeading>
        {description && (
          <StudioParagraph className={classes.description}>{description}</StudioParagraph>
        )}
        {children && <div className={classes.content}>{children}</div>}
        {actions && <div className={classes.actions}>{actions}</div>}
      </div>
    </div>
  );
}

const ForwardedStudioBanner = forwardRef(StudioBanner);

export { ForwardedStudioBanner as StudioBanner };
