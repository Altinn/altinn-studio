import React from 'react';
import { useText } from '../../hooks';
import classes from './error-page.module.css';

type ErrorPageProps = {
  title: string;
  message: string;
  error?: Error;
};
export const ErrorPage = ({ title, message, error }: ErrorPageProps): JSX.Element => {
  const t = useText();
  return (
    <div className={classes.container}>
      <h2>{title}</h2>
      <p>{message}</p>
      {error && (
        <>
          <span>{t('general.details')}</span>
          <div className={classes.errorDetails}>
            <p className={classes.title}>{error.name}</p>
            <p>{error.message}</p>
          </div>
        </>
      )}
    </div>
  );
};
