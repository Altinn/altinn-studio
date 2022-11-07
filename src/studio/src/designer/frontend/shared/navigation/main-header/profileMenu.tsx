import React from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import { withStyles } from '@mui/styles';
import { altinnDocsUrl, sharedUrls } from '../../utils/urlHelper';
import { post } from '../../utils/networking';
import { AccountCircle } from '@mui/icons-material';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
  classes?: any;
}

interface IProfileMenuComponentState {
  anchorEl: any;
}

const styles = {
  paperStyle: {
    borderRadius: 1,
    minWidth: 150,
    padding: 0,
    top: 50,
    right: 25,
  },
  menuItem: {
    fontSize: 16,
    justifyContent: 'flex-end',
    paddingRight: 25,
  },
};

class ProfileMenuComponent extends React.Component<
  IProfileMenuComponentProps,
  IProfileMenuComponentState
> {
  public state = {
    anchorEl: null as any,
  };

  public handleClick = (event: any) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  public handleClose = () => {
    this.setState({ anchorEl: null });
  };

  public handleLogout = () => {
    const url = `${window.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${window.location.origin}/Home/Logout`);
    });
    return true;
  };

  public shouldShowRepositoryLink = () => {
    if (window) {
      const { org, app } = _useParamsClassCompHack();
      if (org && app) {
        return true;
      }
    }
    return false;
  };

  public render() {
    const { anchorEl } = this.state;
    const { classes, showlogout } = this.props;

    return (
      <div>
        <IconButton
          aria-owns={anchorEl ? 'simple-menu' : undefined}
          aria-haspopup='true'
          aria-label='profilikon knapp'
          onClick={this.handleClick}
        >
          <AccountCircle
            fontSize='large'
            titleAccess='profilikon'
            aria-label='profilikon'
          />
        </IconButton>
        <Menu
          id='simple-menu'
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
          anchorReference='none'
          elevation={1}
          classes={{ paper: classes.paperStyle }}
        >
          <MenuItem
            key='placeholder'
            style={{ display: 'none' }}
          />
          {
            // workaround for highlighted menu item not changing.
            // https://github.com/mui-org/material-ui/issues/5186#issuecomment-337278330
          }
          {this.shouldShowRepositoryLink() && (
            <MenuItem className={classes.menuItem}>
              <a
                href={sharedUrls().repositoryUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                Åpne repository
              </a>
            </MenuItem>
          )}
          <MenuItem className={classes.menuItem}>
            <a
              href={altinnDocsUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              Dokumentasjon
            </a>
          </MenuItem>
          {showlogout && (
            <MenuItem
              onClick={this.handleLogout}
              className={classes.menuItem}
            >
              Logout
            </MenuItem>
          )}
        </Menu>
      </div>
    );
  }
}

export default withStyles(styles)(ProfileMenuComponent);
