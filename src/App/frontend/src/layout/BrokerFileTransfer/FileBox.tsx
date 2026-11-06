import React from 'react';
import type { ReactNode } from 'react';

import { ValidationMessage } from '@digdir/designsystemet-react';
import { FileIcon } from '@navikt/aksel-icons';

import classes from 'src/layout/BrokerFileTransfer/FileBox.module.css';

type FileBoxProps = {
  name: ReactNode;
  details: ReactNode;
  error?: ReactNode;
  children?: ReactNode;
};

/** The box that shows one file: icon, name, details, what is wrong with the file, and room for a button or tag */
export function FileBox({ name, details, error, children }: FileBoxProps) {
  return (
    <div className={classes.fileBox}>
      <FileIcon
        aria-hidden
        className={classes.icon}
      />
      <div className={classes.text}>
        <span className={classes.name}>{name}</span>
        <span className={classes.details}>{details}</span>
        {error && <ValidationMessage data-size='sm'>{error}</ValidationMessage>}
      </div>
      {children}
    </div>
  );
}
