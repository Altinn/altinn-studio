/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { MenuProps, Menu, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  paper: {
    border: '1px solid #d3d4d5',
  },
  list: {
    padding: 0,
  },
}));

function AltinnMenu(props: MenuProps, ref: React.Ref<unknown>) {
  const classes = useStyles();
  return (
    <Menu
      classes={classes}
      elevation={0}
      getContentAnchorEl={null}
      ref={ref}
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

export default React.forwardRef<unknown, MenuProps>(AltinnMenu);
