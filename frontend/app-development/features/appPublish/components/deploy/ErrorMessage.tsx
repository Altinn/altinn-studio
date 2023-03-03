import React, { ReactNode } from 'react';
import classes from './ErrorMessage.module.css';

interface Props {
  message: string | ReactNode;
  code: string;
}
export const ErrorMessage = ({ message, code }: Props) => {
  return (
    <>
      <div>{message}</div>
      <div className={classes.typographyTekniskFeilkode}>{code}</div>
    </>
  );
};
