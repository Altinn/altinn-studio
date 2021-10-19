import { ListItemText, Typography, withStyles, ListItemIcon, MenuItem } from '@material-ui/core';
import * as React from 'react';

export interface IAltinnMenuItemProps {
  text: string;
  iconClass: string;
  onClick: (event: React.SyntheticEvent) => void;
  disabled?: boolean;
  id: string;
}

const StyledMenuItem = withStyles({
  root: {
    paddingTop: '0px',
    paddingBottom: '0px',
  },
})(MenuItem);

const AltinnMenuItemIcon = withStyles({
  root: {
    minWidth: '3.0rem',
  },
})(ListItemIcon);

export function AltinnMenuItem({
  text, iconClass, onClick, disabled, id,
}: IAltinnMenuItemProps) {
  return (
    <StyledMenuItem
      onClick={onClick}
      disabled={disabled}
      id={id}
    >
      <AltinnMenuItemIcon>
        <i className={iconClass} />
      </AltinnMenuItemIcon>
      <ListItemText disableTypography={true}>
        <Typography variant='caption'>
          {text}
        </Typography>
      </ListItemText>
    </StyledMenuItem>
  );
}

export default AltinnMenuItem;
