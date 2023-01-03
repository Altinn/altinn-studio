import React from 'react';
import type { MenuProps } from '@mui/material';
import { Menu } from '@mui/material';
import classes from './AltinnMenu.module.css';

function AltinnMenu(props: MenuProps) {
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
