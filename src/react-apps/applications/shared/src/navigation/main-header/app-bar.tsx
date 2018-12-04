import AppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';
import { withStyles, WithStyles } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';
import * as React from 'react';
import { Link } from 'react-router-dom';
import 'typeface-roboto';

import ProfileMenu from '../../profile-menu';

export interface IAppBarComponentProps extends WithStyles<typeof styles> {
  service?: string;
  org?: string;
  classes: any;
  showSubHeader?: boolean;
  activeSubHeaderSelection: string;
}
export interface IAppBarComponentState {
  anchorEl: any;
}

const theme = createMuiTheme({
  overrides: {
    MuiToolbar: {
      regular: {
        '@media (min-width: 600px)': {
          minHeight: 55,
        },
      },
    },
  },
  typography: {
    fontSize: 16,
    useNextVariants: true,
  },
});

const styles = {
  root: {
    flexGrow: 1,
    zIndex: 1,
    height: 110,
    color: 'black',
  },
  appBar: {
    backgroundColor: '#EFEFEF',
    borderBottom: '1px solid',
    borderBottomColor: '#C9C9C9',
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
    const { classes, org, service } = this.props;

    return (
      <div className={classes.root}>
        <MuiThemeProvider theme={theme}>
          <AppBar position='static' className={classes.appBar} elevation={0}>
            <Toolbar>
              <Grid container={true} direction='row' alignItems='center' justify='space-between'>
                <Grid xs={true} item={true}>
                  <img src='/designer/img/altinn_logo_header.png' />
                </Grid>
                <Grid xs={true} item={true}>
                  <Typography align='center' variant='h6'>
                    {service != null ? service : 'WARNING: NO SERVICE NAME'}
                  </Typography>
                </Grid>
                <Grid item={true} xs={true} container={true} direction='row' alignItems='center' justify='flex-end'>
                  <Grid item={true}>
                    <Typography align='center' variant='h6'>
                      {org != null ? org : 'WARNING: NO ORG'}
                    </Typography>
                  </Grid>
                  <Grid item={true}>
                    <ProfileMenu />
                  </Grid>
                </Grid>
              </Grid>
            </Toolbar>
            {this.props.showSubHeader && (
              <Toolbar>
                <Grid container={true} direction='row' justify='center' alignItems='center'>
                  <Grid
                    item={true}
                    className={classNames(classes.subHeader, {
                      [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'om',
                    })}
                  >
                    <Link to='/om' style={{ borderBottom: 0 }}>Om</Link>
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
                    <Link to='/sprak' style={{ borderBottom: 0 }}>Språk</Link>
                  </Grid>
                  <Grid
                    item={true}
                    className={classNames(classes.subHeader, {
                      [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'teste',
                    })}
                  >
                    <Link to='/teste' style={{ borderBottom: 0 }}>Teste</Link>
                  </Grid>
                  <Grid
                    item={true}
                    className={classNames(classes.subHeader, {
                      [classes.subHeaderActive]: this.props.activeSubHeaderSelection === 'publisere',
                    })}
                  >
                    <Link to='/publisere' style={{ borderBottom: 0 }}>Publisere</Link>
                  </Grid>
                </Grid>
              </Toolbar>
            )}
          </AppBar>
        </MuiThemeProvider>
      </div>
    );
  }
}

export default withStyles(styles)(AppBarComponent);
