import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import classes from './RedirectPage.module.css';
import { ErrorPage } from '../ErrorPage';

/**
 * @component
 *    Displays an error page or redirects the user
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const RedirectPage = (): React.ReactNode => {
  const { selectedContext } = useParams();

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
