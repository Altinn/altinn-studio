import React from 'react';
import { Spinner, type SpinnerProps } from '@digdir/designsystemet-react';

import classes from './PageLoading.module.css';

type PageLoadingProps = {
  title: string;
  variant?: SpinnerProps['variant'];
};
/**
 *
 * @description This component is used to display a loading/spinner page.
 * @note This component should only we used once per page. Since it is using aria-live="assertive"
 * and role="alert" it will be read out loud by screen readers.
 */
export const PageLoading = ({ title, variant = 'interaction' }: PageLoadingProps): JSX.Element => {
  return (
    <div className={classes.container}>
      <Spinner title={title} variant={variant} size='xlarge' />
      <p aria-live='assertive' role='alert'>
        {title}
      </p>
    </div>
  );
};
