import React, { type ReactNode } from 'react';
import cn from 'classnames';
import classes from './RedirectBox.module.css';
import { StudioLabelAsParagraph } from '@studio/components';

export type RedirectBoxProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export const RedirectBox = ({
  title,
  children,
  className,
}: RedirectBoxProps): React.ReactElement => {
  const fullClass = cn(classes.wrapper, className);
  return (
    <div className={fullClass}>
      <StudioLabelAsParagraph size='small'>{title}</StudioLabelAsParagraph>
      <div className={classes.children}>{children}</div>
    </div>
  );
};
