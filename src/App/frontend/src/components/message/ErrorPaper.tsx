import React from 'react';
import type { ReactNode } from 'react';

import { ExclamationmarkTriangleFillIcon } from '@navikt/aksel-icons';

import classes from 'src/components/message/ErrorPaper.module.css';

export interface IErrorPaperProps {
  message: ReactNode;
}

export function ErrorPaper(props: IErrorPaperProps) {
  return (
    <div className={classes.paperWrapper}>
      <div className={classes.paper}>
        <div className={classes.paperIcon}>
          <ExclamationmarkTriangleFillIcon aria-hidden='true' />
        </div>
        <div>{props.message}</div>
      </div>
    </div>
  );
}
