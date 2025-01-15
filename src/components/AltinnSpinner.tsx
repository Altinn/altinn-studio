import React from 'react';

import { CircularProgress, Typography } from '@material-ui/core';
import classNames from 'classnames';
import type { ArgumentArray } from 'classnames';

import classes from 'src/components/AltinnSpinner.module.css';
import { useLanguage } from 'src/features/language/useLanguage';

export interface IAltinnSpinnerComponentProvidedProps {
  id?: string;
  spinnerText?: string;
  styleObj?: ArgumentArray;
}

export const AltinnSpinner = (props: IAltinnSpinnerComponentProvidedProps) => {
  const { id, spinnerText, styleObj } = props;
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
