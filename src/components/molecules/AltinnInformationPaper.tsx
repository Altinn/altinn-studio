import React from 'react';
import type { JSX } from 'react';

import { Paper } from '@material-ui/core';

import classes from 'src/components/molecules/AltinnInformationPaper.module.css';

export interface IAltinnInformationPaperProps {
  children: JSX.Element[] | JSX.Element;
}

export function AltinnInformationPaper({ children }: IAltinnInformationPaperProps) {
  return (
    <Paper
      elevation={0}
      className={classes.paper}
    >
      {children}
    </Paper>
  );
}
