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

export interface IAppBarComponentProps extends WithStyles<typeof styles> {
  activeSubHeaderSelection: string;
  activeLeftMenuSelection: string;
  backgroundColor?: any;
  classes: any;
  org?: string;
  service?: string;
  showSubHeader?: boolean;
}
export interface IAppBarComponentState {
  anchorEl: any;
  tabletDrawerOpen: boolean;
}

const styles = createStyles({
  root: {
    flexGrow: 1,
    zIndex: 1,
    color: 'black',
  },
  appBar: {
    borderBottom: '1px solid',
    borderBottomColor: '#C9C9C9',
  },
  breadCrumb: {
    paddingLeft: 30,
    fontSize: 20,
  },
  breadCrumbSubApp: {
    color: '#0062BA',
  },
  button: {
    border: '2px solid #0062BA',
    borderRadius: 0,
    color: '#0062BA',
    fontSize: 18,
    padding: '2px 8px 4px',
    textTransform: 'lowercase',
  },
  paper: {
    textAlign: 'center',
  },
  subHeader: {
    'borderBottom': '2px solid',
    'paddingLeft': 18,
    'paddingRight': 18,
    'paddingBottom': 6,
    'color': 'black',
    'fontSize': 20,
    'borderBottomColor': 'transparent',  // To mitigate the 1 pixel adjustment
    '&:hover': {
      borderBottomColor: 'black',
    },
  },
  subHeaderActive: {
    color: '#0062BA',
    borderBottomColor: '#0062BA',
  },
  topRightService: {
    paddingRight: 22,
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
    const { activeLeftMenuSelection, activeSubHeaderSelection, classes, org, service } = this.props;
    return (
      <div className={classes.root}>
        <AppBar
          position='static'
          color={this.props.backgroundColor}
          className={classes.appBar}
          elevation={0}
        >
          <Toolbar>
            <Grid container={true} direction='row' alignItems='center' justify='space-between'>
              <Grid xs={true} item={true} container={true}>
                <Grid item={true}>
                  <img src='/designer/img/altinn_logo_header.png' />
                </Grid>
                <Hidden mdUp>
                  <Grid item={true} className={classes.breadCrumb}>
                    / {activeSubHeaderSelection} /
                      <span className={classes.breadCrumbSubApp}> {activeLeftMenuSelection} </span>
                  </Grid>
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
                    <ProfileMenu showlogout={true} />
                  </Grid>
                </Hidden>
                <Hidden mdUp>
                  <Grid item={true}>
                    <TabletDrawerMenu
                      handleTabletDrawerMenu={this.handleTabletDrawerMenu}
                      tabletDrawerOpen={this.state.tabletDrawerOpen}
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
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection ===
                          item.activeSubHeaderSelection,
                      })}
                    >
                      <Link to={item.link} style={{ borderBottom: 0 }}>{item.key}</Link>
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
