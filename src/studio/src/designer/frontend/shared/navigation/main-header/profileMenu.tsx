import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { withStyles } from '@material-ui/core/styles';
import AccountCircle from '@material-ui/icons/AccountCircle';
import * as React from 'react';
import { IAltinnWindow } from '../../types';
import { altinnDocsUrl, sharedUrls } from '../../utils/urlHelper';
import { post } from '../../utils/networking';

export interface IProfileMenuComponentProps {
  showlogout?: boolean;
  classes?: any;
}

export interface IProfileMenuComponentState {
  anchorEl: any;
  open: boolean;
}

const styles = ({
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
});

class ProfileMenuComponent extends React.Component<IProfileMenuComponentProps, IProfileMenuComponentState> {
  public state = {
    anchorEl: null as any,
    open: false,
  };

  public handleToggle = () => {
    this.setState((state) => ({ open: !state.open }));
  }

  public handleClick = (event: any) => {
    this.setState({ anchorEl: event.currentTarget });
  }

  public handleClose = () => {
    this.setState({ anchorEl: null });
  }

  public handleLogout = () => {
    const altinnWindow: Window = window;
    const url = `${altinnWindow.location.origin}/repos/user/logout`;
    post(url).then(() => {
      window.location.assign(`${altinnWindow.location.origin}/Home/Logout`);
    });
    return true;
  }

  public shouldShowRepositoryLink = () => {
    if (window) {
      const { org, app } = (window as Window as IAltinnWindow);
      if (org && app) {
        return true;
      }
    }
    return false;
  }

  public handleGiteaRepository = () => {
    this.setState({ anchorEl: null });
    if (window) {
      window.open(sharedUrls().repositoryUrl, '_blank');
      window.focus();
    }
  }

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
          {// workaround for highlighted menu item not changing.
            // https://github.com/mui-org/material-ui/issues/5186#issuecomment-337278330
          }
          {this.shouldShowRepositoryLink() &&
            <MenuItem
              className={classes.menuItem}
            >
              <a
                href={sharedUrls().repositoryUrl}
                target='_blank'
                rel='noopener noreferrer'
              >
                Åpne repository
              </a>
            </MenuItem>
          }
          <MenuItem
            className={classes.menuItem}
          >
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
