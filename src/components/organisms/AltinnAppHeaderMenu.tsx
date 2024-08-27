import React from 'react';

import { IconButton, makeStyles, Menu, MenuItem } from '@material-ui/core';
import { Buldings3Icon, PersonIcon } from '@navikt/aksel-icons';

import { CircleIcon } from 'src/components/CircleIcon';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { logoutUrlAltinn } from 'src/utils/urls/urlHelper';
import type { IParty } from 'src/types/shared';

export interface IAltinnAppHeaderMenuProps {
  party: IParty | undefined;
  logoColor: string;
}

const useStyles = makeStyles({
  paperStyle: {
    borderRadius: 1,
    maxWidth: 100,
    padding: 0,
    top: 50,
  },
  menuItem: {
    fontSize: 16,
    justifyContent: 'flex-end',
    paddingRight: 25,
  },
  iconButton: {
    padding: 0,
    '&:focus-within': {
      outline: 'var(--fds-focus-border-width) solid var(--fds-outer-focus-border-color)',
      outlineOffset: 'var(--fds-focus-border-width)',
      boxShadow: '0 0 0 var(--fds-focus-border-width) var(--fds-inner-focus-border-color)',
    },
  },
});

export function AltinnAppHeaderMenu({ party, logoColor }: IAltinnAppHeaderMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<(EventTarget & HTMLButtonElement) | null>(null);
  const classes = useStyles();
  const { langAsString } = useLanguage();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
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
        aria-label={langAsString('general.header_profile_icon_label')}
        onClick={handleClick}
        className={classes.iconButton}
        id='profile-icon-button'
      >
        <CircleIcon
          size='1.5rem'
          color={logoColor}
        >
          {party.orgNumber ? (
            <Buldings3Icon
              color='white'
              aria-hidden='true'
            />
          ) : (
            <PersonIcon
              color='white'
              aria-hidden='true'
            />
          )}
        </CircleIcon>
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
          <a
            className={'altinnLink'}
            href={logoutUrlAltinn(window.location.origin)}
          >
            <Lang id='general.log_out' />
          </a>
        </MenuItem>
      </Menu>
    </>
  );
}
