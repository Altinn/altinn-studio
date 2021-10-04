/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { withStyles, MenuProps, Menu } from '@material-ui/core';

const AltinnMenu = withStyles({
  paper: {
    border: '1px solid #d3d4d5',
  },
  list: {
    padding: 0,
  },
})((props: MenuProps) => (
  <Menu
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
    {...props}
  />
));

export default AltinnMenu;
