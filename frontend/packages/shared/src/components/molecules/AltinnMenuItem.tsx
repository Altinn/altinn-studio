import React from 'react';
import { ListItemIcon, ListItemText, MenuItem, Typography } from '@mui/material';
import classes from './AltinnMenuItem.module.css';

export interface IAltinnMenuItemProps {
  text: string;
  iconClass?: React.ComponentType;
  onClick: (event: React.SyntheticEvent) => void;
  disabled?: boolean;
  id: string;
  className?: string;
  testId?: string;
}

function AltinnMenuItem(props: IAltinnMenuItemProps, ref: React.Ref<HTMLLIElement>) {
  const { text, iconClass:IconComponent, onClick, disabled, id, className, testId } = props;
  return (
    <MenuItem
      data-testid={testId}
      className={className}
      onClick={onClick}
      disabled={disabled}
      id={id}
      ref={ref}
      classes={{ root: classes.menu }}
    >
      <ListItemIcon classes={{ root: classes.icon }}>
        <i>{IconComponent && <IconComponent />}</i>     
      </ListItemIcon>
      <ListItemText disableTypography={true}>
        <Typography variant='caption'>{text}</Typography>
      </ListItemText>
    </MenuItem>
  );
}

export default React.forwardRef<HTMLLIElement, IAltinnMenuItemProps>(AltinnMenuItem);
