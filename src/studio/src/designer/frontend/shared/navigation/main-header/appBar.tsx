// Extensive used in Material-UI's Grid

import AppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import { altinnImgLogoHeaderUrl } from '../../utils/urlHelper';
import TabletDrawerMenu from '../drawer/TabletDrawerMenu';
import { menu } from './appBarConfig';
import ProfileMenu from './profileMenu';

import altinnStudioTheme from '../../theme/altinnStudioTheme';

export interface IAppBarComponentProps extends WithStyles<typeof styles> {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  classes: any;
  logoutButton?: boolean;
  org?: string;
  app?: string;
  user?: string;
  showBreadcrumbOnTablet?: boolean;
  showSubMenu?: boolean;
}
export interface IAppBarComponentState {
  anchorEl?: any;
  tabletDrawerOpen: boolean;
}

const altinnTheme = altinnStudioTheme;

const styles = createStyles({
  root: {
    flexGrow: 1,
    zIndex: 1,
    color: altinnTheme.altinnPalette.primary.black,
  },
  appBar: {
    borderBottom: '1px solid',
    borderBottomColor: '#C9C9C9',
    color: altinnTheme.altinnPalette.primary.black,
    position: 'fixed',
  },
  appBarDashboard: {
    backgroundColor: altinnTheme.altinnPalette.primary.white,
  },
  appBarEditor: {
    backgroundColor: altinnTheme.altinnPalette.primary.greyLight,
  },
  breadCrumb: {
    paddingLeft: 30,
    fontSize: 20,
  },
  breadCrumbSubApp: {
    color: '#0062BA',
  },
  paper: {
    textAlign: 'center',
  },
  subHeader: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 0,
    fontSize: 20,
  },
  subHeaderLink: {
    borderBottom: '1px solid',
    borderBottomColor: 'transparent', // To mitigate the 1 pixel adjustment
    '&:hover': {
      borderBottom: '1px solid',
      borderBottomColor: altinnTheme.altinnPalette.primary.blueDark,
      color: altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  subHeaderLinkActive: {
    borderBottom: '1px solid',
    borderBottomColor: altinnTheme.altinnPalette.primary.blueDark,
    color: altinnTheme.altinnPalette.primary.blueDark,
    fontWeight: 500,
    '&:hover': {
      borderBottom: '1px solid',
      borderBottomColor: altinnTheme.altinnPalette.primary.blueDark,
      color: altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  topRightService: {
    paddingRight: 22,
  },
  aImgStyling: {
    borderBottom: 'none',
    '&:hover': {
      borderBottom: 'none',
    },
    '&:active': {
      borderBottom: 'none',
    },
  },
});

class AppBarComponent extends React.Component<IAppBarComponentProps, IAppBarComponentState> {
  constructor(props: IAppBarComponentProps) {
    super(props);
    this.state = {
      tabletDrawerOpen: false,
    };
  }

  handleTabletDrawerMenu() {
    this.setState((state: IAppBarComponentState) => {
      return {
        tabletDrawerOpen: !state.tabletDrawerOpen,
      };
    });
  }

  render() {
    const {
      activeLeftMenuSelection,
      activeSubHeaderSelection,
      classes,
      logoutButton,
      org,
      app,
      user,
      showBreadcrumbOnTablet,
    } = this.props;
    return (
      <div className={classes.root}>
        <AppBar
          position='static'
          className={classNames([classes.appBar, !app ? classes.appBarDashboard : classes.appBarEditor])}
          elevation={0}
        >
          <Toolbar>
            <Grid container direction='row'
              alignItems='center' justify='space-between'
            >
              <Grid item xs
                container
              >
                <Grid item>
                  <a href='/' className={classes.aImgStyling}>
                    <img src={altinnImgLogoHeaderUrl} alt='Altinn logo' />
                  </a>
                </Grid>
                <Hidden mdUp>
                  {!showBreadcrumbOnTablet ? null : (
                    <Grid item className={classes.breadCrumb}>
                      {activeSubHeaderSelection && `/ ${activeSubHeaderSelection}`} /
                      <span className={classes.breadCrumbSubApp}> {activeLeftMenuSelection} </span>
                    </Grid>
                  )}
                </Hidden>
              </Grid>
              <Hidden smDown>
                <Grid xs item
                  className={classes.paper}
                >
                  {(org && app) ? `${org} / ${app}` : ''}
                </Grid>
              </Hidden>
              <Grid item xs container direction='row' alignItems='center' justify='flex-end'>
                {user || ''}
                <Hidden smDown>
                  <Grid item>
                    <ProfileMenu
                      showlogout
                    />
                  </Grid>
                </Hidden>
                <Hidden mdUp>
                  <Grid item>
                    <TabletDrawerMenu
                      handleTabletDrawerMenu={this.handleTabletDrawerMenu}
                      tabletDrawerOpen={this.state.tabletDrawerOpen}
                      logoutButton={!logoutButton ? false : logoutButton}
                      activeSubHeaderSelection={activeSubHeaderSelection}
                      activeLeftMenuSelection={activeLeftMenuSelection}
                    />
                  </Grid>
                </Hidden>
              </Grid>
            </Grid>
          </Toolbar>
          <Hidden smDown>
            {this.props.showSubMenu && (
              <Toolbar>
                <Grid container direction='row'
                  justify='center' alignItems='center'
                >
                  {menu.map((item, index) => (
                    <Grid
                      item
                      key={index}
                      className={classNames(classes.subHeader)}
                    >
                      <Link
                        to={item.link}
                        className={classNames(classes.subHeaderLink, {
                          [classes.subHeaderLinkActive]: this.props.activeSubHeaderSelection ===
                            item.activeSubHeaderSelection,
                        })}
                      >
                        {item.key}
                      </Link>
                    </Grid>
                  ))}
                </Grid>
              </Toolbar>
            )}
          </Hidden>
        </AppBar>
      </div>
    );
  }
}

export default withStyles(styles)(AppBarComponent);
