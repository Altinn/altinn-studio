import React from 'react';
import { ListItemIcon, ListItemText, MenuItem, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';

export interface IAltinnMenuItemProps {
  text: string;
  iconClass: string;
  onClick: (event: React.SyntheticEvent) => void;
  disabled?: boolean;
  id: string;
  className?: string;
  testId?: string;
}

const useStyles = makeStyles(() => ({
  menu: {
    paddingTop: '0px',
    paddingBottom: '0px',
  },
  icon: {
    minWidth: '3.0rem',
  },
}));

function AltinnMenuItem(props: IAltinnMenuItemProps, ref: React.Ref<HTMLLIElement>) {
  const classes = useStyles();
  const { text, iconClass, onClick, disabled, id, className, testId } = props;
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
        <i className={iconClass} />
      </ListItemIcon>
      <ListItemText disableTypography={true}>
        <Typography variant='caption'>{text}</Typography>
      </ListItemText>
    </MenuItem>
  );
}

export default React.forwardRef<HTMLLIElement, IAltinnMenuItemProps>(AltinnMenuItem);
