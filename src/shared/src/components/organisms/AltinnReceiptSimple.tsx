import { Typography, makeStyles } from '@material-ui/core';
import React from 'react';

export interface IReceiptComponentProps {
  body: string | JSX.Element | JSX.Element[];
  title: string;
}

const useStyles = makeStyles(() => ({
  paddingTop24: {
    paddingTop: '2.4rem',
  },
  wordBreak: {
    wordBreak: 'break-word',
  },
}));

export function ReceiptComponentSimple({
  title,
  body,
}: IReceiptComponentProps) {
  const classes = useStyles();

  return (
    <div className={classes.wordBreak}>
      <Typography variant='h2'>{title}</Typography>

      <Typography
        variant='body1'
        className={classes.paddingTop24}
      >
        {body}
      </Typography>
    </div>
  );
}

export default ReceiptComponentSimple;
