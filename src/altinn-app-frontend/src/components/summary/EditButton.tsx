import * as React from 'react';

import { IconButton, makeStyles, Typography } from '@material-ui/core';

export interface IEditButtonProps {
  onClick: () => void;
  editText: string | null;
}

const useStyles = makeStyles({
  editButton: {
    color: 'black',
    padding: 0,
  },
  editIcon: {
    paddingLeft: '6px',
    fontSize: '1.8rem !important',
  },
  change: {
    fontSize: '1.8rem',
    cursor: 'pointer',
  },
});

export function EditButton(props: IEditButtonProps) {
  const classes = useStyles();

  return (
    <IconButton
      onClick={props.onClick}
      className={classes.editButton}
    >
      <Typography
        variant='body1'
        className={classes.change}
      >
        <span>{props.editText}</span>
        <i
          aria-hidden='true'
          className={`fa fa-editing-file ${classes.editIcon}`}
        />
      </Typography>
    </IconButton>
  );
}
