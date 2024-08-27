import React from 'react';

import { CircularProgress, createStyles, makeStyles, Typography } from '@material-ui/core';
import classNames from 'classnames';
import type { ArgumentArray } from 'classnames';

import { useLanguage } from 'src/features/language/useLanguage';

export interface IAltinnSpinnerComponentProvidedProps {
  id?: string;
  spinnerText?: string;
  styleObj?: ArgumentArray;
}

const useStyles = makeStyles((theme) =>
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

export const AltinnSpinner = (props: IAltinnSpinnerComponentProvidedProps) => {
  const { id, spinnerText, styleObj } = props;
  const classes = useStyles(props);
  const { langAsString } = useLanguage();

  return (
    <div
      className={classNames(styleObj)}
      data-testid='altinn-spinner'
    >
      <CircularProgress
        role='progressbar'
        className={classNames(classes.spinner)}
        aria-label={spinnerText || langAsString('general.loading')}
        id={id}
      />
      <Typography
        className={classNames(classes.spinnerText)}
        role='alert'
        aria-busy={true}
        aria-label={spinnerText || langAsString('general.loading')}
      >
        {spinnerText || ''}
      </Typography>
    </div>
  );
};
