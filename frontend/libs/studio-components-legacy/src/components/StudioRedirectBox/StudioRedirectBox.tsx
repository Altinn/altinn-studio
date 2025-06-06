import React, { type ReactElement, type HTMLAttributes } from 'react';
import cn from 'classnames';
import classes from './StudioRedirectBox.module.css';
import { StudioLabelAsParagraph } from '@studio/components-legacy';

export type StudioRedirectBoxProps = {
  title: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioRedirectBox = ({
  title,
  children,
  className: givenClassName,
}: StudioRedirectBoxProps): ReactElement => {
  const className = cn(classes.wrapper, givenClassName);
  return (
    <div className={className}>
      <StudioLabelAsParagraph size='small'>{title}</StudioLabelAsParagraph>
      <div className={classes.children}>{children}</div>
    </div>
  );
};
