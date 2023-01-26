import * as React from 'react';

import { CircularProgress, createStyles, createTheme, makeStyles, Typography } from '@material-ui/core';
import classNames from 'classnames';
import type { ArgumentArray } from 'classnames';

import altinnTheme from 'src/theme/altinnStudioTheme';

export interface IAltinnSpinnerComponentProvidedProps {
  id?: string;
  spinnerText?: any;
  styleObj?: ArgumentArray;
}

const theme = createTheme(altinnTheme);

const useStyles = makeStyles(() =>
  createStyles({
    spinner: {
      color: theme.altinnPalette.primary.blueDark,
      marginRight: 'auto',
      marginLeft: 'auto',
      display: 'inline-block',
    },
    spinnerText: {
      display: 'inline-block',
      fontSize: 16,
      marginLeft: '10px',
      verticalAlign: 'middle',
      marginBottom: '25px',
    },
  }),
);

const AltinnSpinner = (props: IAltinnSpinnerComponentProvidedProps) => {
  const { id, spinnerText, styleObj } = props;
  const classes = useStyles(props);

  return (
    <div
      className={classNames(styleObj)}
      data-testid='altinn-spinner'
    >
      <CircularProgress
        role='progressbar'
        className={classNames(classes.spinner)}
        id={id}
      />

      <Typography
        className={classNames(classes.spinnerText)}
        role='alert'
        aria-busy={true}
        aria-label={spinnerText || 'Laster innhold'}
      >
        {spinnerText || ''}
      </Typography>
    </div>
  );
};

export default AltinnSpinner;
