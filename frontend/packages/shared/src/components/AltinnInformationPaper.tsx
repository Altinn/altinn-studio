import React from 'react';
import { Paper } from '@mui/material';
import classes from './AltinnInformationPaper.module.css';

export interface IAltinnInformationPaperCompontentProvidedProps {
  children: React.ReactNode;
}

export const AltinnInformationPaper = ({
  children,
}: IAltinnInformationPaperCompontentProvidedProps) =>  (
  <Paper elevation={0} className={classes.paper}>
    {children}
  </Paper>
);

export default AltinnInformationPaper;
