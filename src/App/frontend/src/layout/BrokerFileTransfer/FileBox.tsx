import React from 'react';
import type { ReactNode } from 'react';

import { FileIcon } from '@navikt/aksel-icons';

import classes from 'src/layout/BrokerFileTransfer/FileBox.module.css';

type FileBoxProps = {
  name: ReactNode;
  details: ReactNode;
  children?: ReactNode;
};

/** The box that shows one file: icon, name, details and room for a button or tag */
export function FileBox({ name, details, children }: FileBoxProps) {
  return (
    <div className={classes.fileBox}>
      <FileIcon
        aria-hidden
        className={classes.icon}
      />
      <div className={classes.text}>
        <span className={classes.name}>{name}</span>
        <span className={classes.details}>{details}</span>
      </div>
      {children}
    </div>
  );
}
