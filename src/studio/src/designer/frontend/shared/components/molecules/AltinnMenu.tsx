import React from 'react';
import { makeStyles, Menu, MenuProps } from '@material-ui/core';

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
      getContentAnchorEl={null}
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
