import React from 'react';

import { makeStyles, Typography } from '@material-ui/core';

export interface IReceiptComponentProps {
  body: string | JSX.Element | JSX.Element[];
  title: string | JSX.Element | JSX.Element[];
}

const useStyles = makeStyles(() => ({
  paddingTop24: {
    paddingTop: '1.5rem',
  },
  wordBreak: {
    wordBreak: 'break-word',
  },
}));

export function ReceiptComponentSimple({ title, body }: IReceiptComponentProps) {
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
