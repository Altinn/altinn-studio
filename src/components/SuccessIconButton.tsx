import React from 'react';
import type { ReactNode } from 'react';

import { IconButton, makeStyles } from '@material-ui/core';

export interface ISuccessIconButtonProps {
  label: ReactNode;
  onClick: () => void;
  id?: string;
}

const useStyles = makeStyles((theme) => ({
  successIconButton: {
    color: theme.altinnPalette.primary.black,
    borderRadius: '5px',
    padding: '7px 6px 7px 0px',
    marginLeft: '0',
    marginTop: '24px',
    fontWeight: 700,
    '& .successIconButton-label': {
      borderBottom: `2px solid transparent`,
    },
    '& .ai': {
      color: theme.altinnPalette.primary.green,
      marginTop: '-2px',
    },
    '&:hover': {
      background: 'none',
      '& .successIconButton-label': {
        borderBottom: `2px solid ${theme.altinnPalette.primary.black}`,
      },
    },
    '&:focus': {
      outlineColor: theme.altinnPalette.primary.green,
    },
  },
}));

export function SuccessIconButton({ label, onClick, id }: ISuccessIconButtonProps) {
  const classes = useStyles();
  return (
    <IconButton
      id={id}
      classes={{ root: classes.successIconButton }}
      onClick={onClick}
    >
      <i className='ai ai-check-circle' />
      <span className='successIconButton-label'>{label}</span>
    </IconButton>
  );
}
