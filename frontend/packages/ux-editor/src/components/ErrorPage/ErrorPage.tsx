import React from 'react';
import classes from './ErrorPage.module.css';

type ErrorPageProps = {
  title: string;
  message: string;
};
export const ErrorPage = ({ title, message }: ErrorPageProps): JSX.Element => {
  return (
    <div className={classes.container}>
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  );
};
