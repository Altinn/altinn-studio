import React, { type ReactElement, type HTMLAttributes } from 'react';
import cn from 'classnames';
import classes from './StudioRedirectBox.module.css';
import { StudioLabelAsParagraph } from '../StudioLabelAsParagraph';

export type StudioRedirectBoxProps = {
  title: string;
} & HTMLAttributes<HTMLDivElement>;

export function StudioRedirectBox({
  title,
  children,
  className: givenClassName,
}: StudioRedirectBoxProps): ReactElement {
  const className = cn(classes.wrapper, givenClassName);
  return (
    <div className={className}>
      <StudioLabelAsParagraph>{title}</StudioLabelAsParagraph>
      <div className={classes.children}>{children}</div>
    </div>
  );
}
