import React, { type ReactNode } from 'react';
import classes from './RedirectBox.module.css';
import { StudioLabelAsParagraph } from '@studio/components';

export type RedirectBoxProps = {
  title: string;
  children: ReactNode;
};

export const RedirectBox = ({ title, children }: RedirectBoxProps): React.ReactElement => {
  return (
    <div className={classes.wrapper}>
      <StudioLabelAsParagraph size='small'>{title}</StudioLabelAsParagraph>
      <div className={classes.children}>{children}</div>
    </div>
  );
};
