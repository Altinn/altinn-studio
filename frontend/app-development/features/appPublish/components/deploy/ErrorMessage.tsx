import React, { ReactNode } from 'react';
import classes from './ErrorMessage.module.css';

type ErrorMessageProps = {
  message: string | ReactNode;
  code: string;
};
export const ErrorMessage = ({ message, code }: ErrorMessageProps) => {
  return (
    <>
      <div>{message}</div>
      <div className={classes.typographyTekniskFeilkode}>{code}</div>
    </>
  );
};
