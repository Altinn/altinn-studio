import classes from './ErrorPage.module.css';

import type { JSX } from 'react';

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
