import React from 'react';
import { Navigate } from 'react-router-dom';
import classes from './RedirectPage.module.css';
import { ErrorPage } from '../ErrorPage';
import { useUrlParams } from 'resourceadm/hooks/useSelectedContext';

/**
 * @component
 *    Displays an error page or redirects the user
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const RedirectPage = (): React.ReactNode => {
  const { selectedContext } = useUrlParams();

  return (
    <div className={classes.pageWrapper}>
      {selectedContext === 'all' ? (
        // Error page if user has chosen "Alle"
        <ErrorPage />
      ) : (
        <Navigate to={`${selectedContext}-resources/`} replace={true} />
      )}
    </div>
  );
};
