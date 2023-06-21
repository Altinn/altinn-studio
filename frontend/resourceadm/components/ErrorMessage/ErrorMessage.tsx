import React from 'react';
import classes from './errorMessage.module.css';

type ErrorMessageProps = {
  title: string;
  message: string;
  children?: React.ReactNode;
};
export const ErrorMessage = ({ title, message, children }: ErrorMessageProps): JSX.Element => {
  return (
    <div className={classes.errorMessage}>
      <h1>{title}</h1>
      <p>{message}</p>
      <p>Om problemet vedvarer, ta kontakt med oss på brukerservice +47 75 00 60 00.</p>
      {children}
    </div>
  );
};
