import { ListItemText, Typography, withStyles, ListItemIcon } from '@material-ui/core';
import * as React from 'react';

export interface IMenuItemContent {
  text: string;
  iconClass: string;
}

export function MenuItemContent({ text, iconClass }: IMenuItemContent) {
  return (
    <>
      <MenuItemIcon>
        <i className={iconClass} />
      </MenuItemIcon>
      <ListItemText disableTypography={true}>
        <Typography variant='caption'>
          {text}
        </Typography>
      </ListItemText>
    </>
  );
}

export const MenuItemIcon = withStyles({
  root: {
    minWidth: '3.0rem',
  },
})(ListItemIcon);
