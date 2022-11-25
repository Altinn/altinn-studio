import React from 'react';
import type { MenuProps } from '@mui/material';
import { Menu } from '@mui/material';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles(() => ({
  paper: {
    border: '1px solid #d3d4d5',
  },
  list: {
    padding: 0,
  },
}));

function AltinnMenu(props: MenuProps) {
  const classes = useStyles();
  return (
    <Menu
      classes={classes}
      elevation={0}
      anchorEl={null}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      PaperProps={{
        square: true,
      }}
      {...props}
    />
  );
}

export default AltinnMenu;
