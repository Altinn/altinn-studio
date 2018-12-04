/* tslint:disable:jsx-boolean-value */
// Extensive used in Material-UI's Grid

import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import { MuiThemeProvider } from '@material-ui/core/styles';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
// import 'typeface-roboto';

import Hidden from '@material-ui/core/Hidden';
import altinnTheme from '../../theme/altinnStudioTheme';

// Altinn-Studio components
import ProfileMenu from './profileMenu';

export interface IAppBarComponentProps extends WithStyles<typeof styles> {
  service?: string;
  org?: string;
  classes: any;
  showSubHeader?: boolean;
  activeSubHeaderSelection: string;
  activeLeftMenuSelection: string;
}
export interface IAppBarComponentState {
  anchorEl: any;
}

const styles = {
  root: {
    flexGrow: 1,
    zIndex: 1,
    color: 'black',
  },
  appBar: {
    backgroundColor: '#EFEFEF',
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
    width: 60,
    height: 36,
    fontSize: altinnTheme.typography.fontSize,
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
};

class AppBarComponent extends React.Component<IAppBarComponentProps, IAppBarComponentState> {
  public state: IAppBarComponentState = {
    anchorEl: null,
  };

  public render() {
    const { activeLeftMenuSelection, activeSubHeaderSelection, classes, org, service } = this.props;
    console.log('activeLeftMenuSelection', activeLeftMenuSelection);
    console.log('activeSubHeaderSelection', activeSubHeaderSelection);

    return (
      <div className={classes.root}>
        <MuiThemeProvider theme={altinnTheme}>
          <AppBar position='static' className={classes.appBar} elevation={0}>
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
                    {service != null ? service : 'WARNING: NO SERVICE NAME'}
                  </Grid>
                </Hidden>
                <Grid item={true} xs={true} container={true} direction='row' alignItems='center' justify='flex-end'>
                  <Grid item={true} className={classes.paper}>
                    <Hidden smDown>
                      {org != null ? org : 'WARNING: NO ORG'}
                    </Hidden>
                    <Hidden mdUp>
                      {service !== null ? service : 'WARNING: NO SERVICE NAME'}
                    </Hidden>
                  </Grid>
                  <Hidden smDown>
                    <Grid item={true}>
                      <ProfileMenu showlogout={true} />
                    </Grid>
                  </Hidden>
                  <Hidden mdUp>
                    <Grid item={true}>
                      <Button variant='outlined' className={classes.button}>MENU</Button>
                    </Grid>
                  </Hidden>

                </Grid>
              </Grid>
            </Toolbar>
            <Hidden smDown>
              {this.props.showSubHeader && (
                <Toolbar>
                  <Grid container={true} direction='row' justify='center' alignItems='center'>
                    <Grid
                      item={true}
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'om',
                      })}
                    >
                      <Link to='/about' style={{ borderBottom: 0 }}>Om</Link>
                    </Grid>
                    <Grid
                      item={true}
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'lage',
                      })}
                    >
                      <Link to='/uieditor' style={{ borderBottom: 0 }}>Lage</Link>
                    </Grid>
                    <Grid
                      item={true}
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'sprak',
                      })}
                    >
                      <Link to='/language' style={{ borderBottom: 0 }}>Språk</Link>
                    </Grid>
                    <Grid
                      item={true}
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'teste',
                      })}
                    >
                      <Link to='/test' style={{ borderBottom: 0 }}>Teste</Link>
                    </Grid>
                    <Grid
                      item={true}
                      className={classNames(classes.subHeader, {
                        [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'publisere',
                      })}
                    >
                      <Link to='/publish' style={{ borderBottom: 0 }}>Publisere</Link>
                    </Grid>
                  </Grid>
                </Toolbar>
              )}
            </Hidden>
          </AppBar>
        </MuiThemeProvider>
      </div>
    );
  }
}

export default withStyles(styles)(AppBarComponent);
