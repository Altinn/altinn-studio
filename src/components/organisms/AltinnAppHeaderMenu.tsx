import React from 'react';

import { IconButton, makeStyles, Menu, MenuItem } from '@material-ui/core';

import { AltinnIcon } from 'src/components/AltinnIcon';
import { logoutUrlAltinn } from 'src/utils/urls/urlHelper';
import type { IParty } from 'src/types/shared';

export interface IAltinnAppHeaderMenuProps {
  party: IParty | undefined;
  logoColor: string;
  ariaLabel: string;
  logoutText: string;
}

const useStyles = makeStyles({
  paperStyle: {
    borderRadius: 1,
    maxWidth: 100,
    padding: 0,
    top: 50,
    right: 25,
  },
  menuItem: {
    fontSize: 16,
    justifyContent: 'flex-end',
    paddingRight: 25,
  },
  iconButton: {
    padding: 0,
    '&:focus': {
      outline: 'var(--semantic-tab_focus-outline-color) solid var(--semantic-tab_focus-outline-width)',
      outlineOffset: 'var(--semantic-tab_focus-outline-offset)',
    },
  },
});

export function AltinnAppHeaderMenu(props: IAltinnAppHeaderMenuProps) {
  const { party, logoColor, ariaLabel, logoutText } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const classes = useStyles();

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  if (!party) {
    return null;
  }

  return (
    <>
      <IconButton
        aria-owns={anchorEl ? 'profile-menu' : undefined}
        aria-haspopup='true'
        aria-label={ariaLabel}
        onClick={handleClick}
        className={classes.iconButton}
        id='profile-icon-button'
      >
        <AltinnIcon
          iconClass={`fa ${party.orgNumber ? 'fa-corp-circle-big' : 'fa-private-circle-big'}`}
          iconColor={logoColor}
          iconSize={31}
        />
      </IconButton>
      <Menu
        id='profile-menu'
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        elevation={1}
        anchorReference='anchorEl'
        classes={{ paper: classes.paperStyle }}
        getContentAnchorEl={null}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <MenuItem
          key='placeholder'
          style={{ display: 'none' }}
        />
        {
          // workaround for highlighted menu item not changing.
          // https://github.com/mui-org/material-ui/issues/5186#issuecomment-337278330
        }
        <MenuItem
          className={classes.menuItem}
          id='logout-menu-item'
        >
          <a href={logoutUrlAltinn(window.location.origin)}>{logoutText}</a>
        </MenuItem>
      </Menu>
    </>
  );
}
