import { IconButton, makeStyles, Menu, MenuItem } from '@material-ui/core';
import * as React from 'react';
import { AltinnIcon } from '..';
import { IParty } from '../../types';
import { logoutUrlAltinn } from '../../utils';

export interface IAltinnAppHeaderMenuProps {
  party: IParty;
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
  },
});

function AltinnAppHeaderMenu(props: IAltinnAppHeaderMenuProps) {
  const {
    party,
    logoColor,
    ariaLabel,
    logoutText,
  } = props;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const classes = useStyles();

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton
        aria-owns={anchorEl ? 'simple-menu' : undefined}
        aria-haspopup='true'
        aria-label={ariaLabel}
        onClick={handleClick}
        className={classes.iconButton}
        id='profile-icon-button'
      >
        {party && party.ssn &&
          <AltinnIcon
            iconClass='fa fa-private-circle-big'
            iconColor={logoColor}
            iconSize={31}
            margin='0px 0px 0px 5px'
          />
        }
        {party && party.orgNumber &&
          <AltinnIcon
            iconClass='fa fa-corp-circle-big'
            iconColor={logoColor}
            iconSize={31}
            margin='0px 0px 0px 5px'
          />
        }
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
          className={classes.menuItem}
          id='logout-menu-item'
        >
          <a href={logoutUrlAltinn(window.location.origin)}>
            {logoutText}
          </a>
        </MenuItem>
      </Menu>
    </>
  );
}

export default AltinnAppHeaderMenu;
