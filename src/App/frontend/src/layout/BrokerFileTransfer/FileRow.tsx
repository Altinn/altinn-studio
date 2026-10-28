import React from 'react';
import type { ReactNode } from 'react';

import { FileIcon } from '@navikt/aksel-icons';

import classes from 'src/layout/BrokerFileTransfer/FileRow.module.css';

type FileRowProps = {
  name: ReactNode;
  details: ReactNode;
  children?: ReactNode;
};

export function FileRow({ name, details, children }: FileRowProps) {
  return (
    <div className={classes.fileRow}>
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
