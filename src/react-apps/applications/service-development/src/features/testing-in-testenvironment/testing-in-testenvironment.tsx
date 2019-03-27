import { Grid, Hidden, Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
// import VersionControlHeader from '../../../../shared/src/version-control/versionControlHeader';

const theme = createMuiTheme(altinnTheme);

const styles = () => createStyles({
  mainLayout: {
    paddingTop: 20,
    [theme.breakpoints.up('md')]: {
      height: `calc(100vh - 110px)`,
      overflowY: 'auto',
      paddingLeft: theme.sharedStyles.mainPaddingLeft,
    },
    [theme.breakpoints.down('sm')]: {
      height: `calc(100vh - 55px)`,
      overflowY: 'auto',
    },
  },
  ingress: {
    paddingTop: 10,
  },
  deployPlaceholderStyle: {
    marginTop: 24,
    [theme.breakpoints.up('md')]: {
      paddingRight: 60,
    },
  },
  aboutServicePlaceholderStyle: {
    [theme.breakpoints.up('md')]: {
      borderLeft: '1px solid ' + theme.altinnPalette.primary.greyMedium,
      paddingLeft: 12,
    },
    marginTop: 24,
  },
});

export interface ITestingInTestenvironmentContainerProps extends WithStyles<typeof styles> {
  language: any;
  name?: any;
  repoStatus: any;
}

export interface ITestingInTestenvironmentContainerState {
}

export class TestingInTestenvironmentContainer extends
  React.Component<ITestingInTestenvironmentContainerProps, ITestingInTestenvironmentContainerState> {

  constructor(_props: ITestingInTestenvironmentContainerProps, _state: ITestingInTestenvironmentContainerState) {
    super(_props, _state);
    this.state = {

    };
  }

  // public componentDidMount() {
  // }

  // public componentWillUnmount() {
  // }

  public render() {
    const { classes } = this.props;
    return (
      <React.Fragment>
        <div className={classes.mainLayout}>
          <Grid container={true} justify='center'>
            <Grid item={true} xs={11} sm={10} md={11}>
              <Typography variant='h1'>
                {getLanguageFromKey('testing.testing_in_testenv_title', this.props.language)}
              </Typography>
              <Typography variant='body1' className={classes.ingress}>
                {getLanguageFromKey('testing.testing_in_testenv_body', this.props.language)}
              </Typography>
            </Grid>

            <Grid item={true} xs={11} sm={7} md={7} className={classes.deployPlaceholderStyle}>

              <Paper square={true} elevation={1} style={{ padding: 24 }}>
                Placeholder for Tjenesten er klar til å legges ut i testmiljø
              </Paper>

            </Grid>
            <Hidden mdUp={true} xsDown={true}>
              <Grid item={true} sm={3}>
                {/* grid padding */}
              </Grid>
            </Hidden>

            <Grid item={true} xs={11} sm={7} md={4} className={classes.aboutServicePlaceholderStyle}>

              <Paper square={true} elevation={1} style={{ padding: 24 }}>
                Placeholder for "Tjenesten i testmiljø"
              </Paper>

            </Grid>
            <Hidden mdUp={true} xsDown={true}>
              <Grid item={true} sm={3}>
                {/* grid padding */}
              </Grid>
            </Hidden>
          </Grid>

        </div>
      </React.Fragment >
    );
  }
}

const makeMapStateToProps = () => {
  const mapStateToProps = (
    state: IServiceDevelopmentState,
  ) => {
    return {
      language: state.language,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(TestingInTestenvironmentContainer));
