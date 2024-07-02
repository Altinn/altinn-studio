import React from 'react';
import { Navigate } from 'react-router-dom';
import classes from './RedirectPage.module.css';
import { ErrorPage } from '../ErrorPage';
import { useUrlParams } from '../../hooks/useUrlParams';

/**
 * @component
 *    Displays an error page or redirects the user
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const RedirectPage = (): React.JSX.Element => {
  const { org } = useUrlParams();

  return (
    <div className={classes.pageWrapper}>
      {org === 'all' ? (
        // Error page if user has chosen "Alle"
        <ErrorPage />
      ) : (
        <Navigate to={`${org}-resources/`} replace={true} />
      )}
    </div>
  );
};
