import React from 'react';

import { Paragraph, Spinner } from '@digdir/designsystemet-react';
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
      <Spinner
        role='progressbar'
        aria-label={spinnerText || langAsString('general.loading')}
        id={id}
      />
      <Paragraph
        className={classNames(classes.spinnerText)}
        role='alert'
        aria-busy={true}
        aria-label={spinnerText || langAsString('general.loading')}
      >
        {spinnerText || ''}
      </Paragraph>
    </div>
  );
};
