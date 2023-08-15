import React from 'react';
import classes from './ErrorPage.module.css';
import { Heading } from '@digdir/design-system-react';
import { Link } from 'resourceadm/components/Link';

/**
 * @component
 *    Displays an error page
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ErrorPage = (): React.ReactNode => {
  return (
    <div className={classes.pageWrapper}>
      <Heading size='medium' level={1} spacing>
        Du har nådd en ugyldig adresse
      </Heading>
      <Link href='/' text='Gå tilbake til dashboard' />
    </div>
  );
};
