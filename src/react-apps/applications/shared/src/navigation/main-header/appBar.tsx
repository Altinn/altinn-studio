/* tslint:disable:jsx-boolean-value */
// Extensive used in Material-UI's Grid

import AppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import Hidden from '@material-ui/core/Hidden';
import { createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import TabletDrawerMenu from '../drawer/TabletDrawerMenu';
import { menu } from './appBarConfig';
import ProfileMenu from './profileMenu';

import theme from '../../theme/altinnStudioTheme';

export interface IAppBarComponentProps extends WithStyles<typeof styles> {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  backgroundColor?: any;
  classes: any;
  logoutButton?: boolean;
  org?: string;
  service?: string;
  showBreadcrumbOnTablet?: boolean;
  showSubHeader?: boolean;
}
export interface IAppBarComponentState {
  anchorEl: any;
  tabletDrawerOpen: boolean;
}

const altinnTheme = theme;

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
    'borderBottom': '1px solid',
    'borderBottomColor': 'transparent',  // To mitigate the 1 pixel adjustment
    '&:hover': {
      borderBottom: '1px solid',
      borderBottomColor: altinnTheme.altinnPalette.primary.blueDark,
      color: altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  subHeaderLinkActive: {
    'borderBottom': '1px solid',
    'borderBottomColor': altinnTheme.altinnPalette.primary.blueDark,
    'color': altinnTheme.altinnPalette.primary.blueDark,
    'fontWeight': 500,
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
    'borderBottom': 'none',
    '&:hover': {
      borderBottom: 'none',
    },
    '&:active': {
      borderBottom: 'none',
    },
  },
});

class AppBarComponent extends React.Component<IAppBarComponentProps, IAppBarComponentState> {
  public state: IAppBarComponentState = {
    anchorEl: null,
    tabletDrawerOpen: false,
  };

  public handleTabletDrawerMenu = () => {
    this.setState((state: IAppBarComponentState) => {
      return {
        tabletDrawerOpen: !state.tabletDrawerOpen,
      };
    });
  }

  public render() {
    const {
      activeLeftMenuSelection,
      activeSubHeaderSelection,
      backgroundColor,
      classes,
      logoutButton,
      org,
      service,
      showBreadcrumbOnTablet,
    } = this.props;

    return (
      <div className={classes.root}>
        <AppBar
          position='static'
          className={classes.appBar}
          elevation={0}
          style={{ backgroundColor: backgroundColor ? backgroundColor : altinnTheme.altinnPalette.primary.greyLight }}
        >
          <Toolbar>
            <Grid container={true} direction='row' alignItems='center' justify='space-between'>
              <Grid xs={true} item={true} container={true}>
                <Grid item={true}>
                  <a href='/' className={classes.aImgStyling}>
                    <img src='/designer/img/altinn_logo_header.png' />
                  </a>
                </Grid>
                <Hidden mdUp>
                  {!showBreadcrumbOnTablet ? null : (
                    <Grid item={true} className={classes.breadCrumb}>
                      {activeSubHeaderSelection ? `/ ${activeSubHeaderSelection}` : null} /
                      <span className={classes.breadCrumbSubApp}> {activeLeftMenuSelection} </span>
                    </Grid>
                  )}
                </Hidden>
              </Grid>
              <Hidden smDown>
                <Grid xs={true} item={true} className={classes.paper}>
                  {service ? service : 'WARNING: NO SERVICE NAME'}
                </Grid>
              </Hidden>
              <Grid item={true} xs={true} container={true} direction='row' alignItems='center' justify='flex-end'>
                <Grid item={true}>
                  <Hidden smDown>
                    {org ? org : 'WARNING: NO ORG'}
                  </Hidden>
                  <Hidden mdUp>
                    <div className={classes.topRightService}>
                      {service ? service : 'WARNING: NO SERVICE NAME'}
                    </div>
                  </Hidden>
                </Grid>
                <Hidden smDown>
                  <Grid item={true}>
                    <ProfileMenu
                      showlogout={true}
                    />
                  </Grid>
                </Hidden>
                <Hidden mdUp>
                  <Grid item={true}>
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
            {this.props.showSubHeader && (
              <Toolbar>
                <Grid container={true} direction='row' justify='center' alignItems='center'>
                  {menu.map((item, index) => (
                    <Grid
                      item={true}
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
