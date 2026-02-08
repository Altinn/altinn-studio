import React from 'react';
import { useRouteError } from 'react-router-dom';

import { RouterErrorResolver } from 'nextsrc/core/routerErrorResolver';
import classes from 'nextsrc/features/instantiate/pages/error/ErrorPage.module.css';

export const ErrorPage = () => {
  const error = useRouteError();

  return (
    <div className={classes.container}>
      <h1>Something went wrong</h1>
      <p>{RouterErrorResolver.resolveMessage(error)}</p>
    </div>
  );
};
