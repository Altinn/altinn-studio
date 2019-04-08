import { Grid, Hidden, Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
// import VersionControlHeader from '../../../../shared/src/version-control/versionControlHeader';

import DeployPaper from '../components/deployPaper';
import DeployActionDispacher from '../deployDispatcher';

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
  mainGridStyle: {
    maxWidth: 1340,
  },
});

export interface IDeployToTestContainerProps extends WithStyles<typeof styles> {
  deploymentList: any;
  language: any;
  masterRepoStatus: any;
  name?: any;
  repoStatus: any;
}

export interface IDeployToTestContainerState {
  deploySuccess: boolean;
}

export class DeployToTestContainer extends
  React.Component<IDeployToTestContainerProps, IDeployToTestContainerState> {

  constructor(_props: IDeployToTestContainerProps, _state: IDeployToTestContainerState) {
    super(_props, _state);
    this.state = {
      deploySuccess: null,
    };
  }

  public componentDidMount() {
    const altinnWindow: any = window;
    const { org, service } = altinnWindow;
    DeployActionDispacher.fetchDeployments('at21', org, service);
    DeployActionDispacher.fetchMasterRepoStatus('TODO', org, service);
  }

  // public componentWillUnmount() {
  // }

  public returnInSyncStatus = (repoStatus: any): any => {
    switch (repoStatus) {
      case repoStatus.aheadBy > 0:
        return 'ahead';
      case repoStatus.behindBy > 0:
        return 'behind';
      default:
        return 'ready';
    }
  }

  public returnMasterRepoAndDeployInSync = (env: string, masterRepoStatus: any, deploymentList: any): any => {
    // console.log('deploymentList', deploymentList);
    const image = deploymentList[env].items[0].spec.template.spec.containers[0].image;
    const imageTag = image.split(':')[1];
    // console.log('imageTag', imageTag);
    // console.log('masterRepoStatus.commit.id', masterRepoStatus.commit.id);
    if (masterRepoStatus !== null && masterRepoStatus.commit.id === imageTag) {
      return true;
    } else {
      return false;
    }
  }

  public render() {
    const { classes } = this.props;
    const { deploySuccess } = this.state;

    return (
      <React.Fragment>
        <div className={classes.mainLayout}>
          <Grid container={true} justify='center' className={classes.mainGridStyle}>
            <Grid item={true} xs={11} sm={10} md={11}>
              <Typography variant='h1' style={{ fontWeight: 400 }}>
                {getLanguageFromKey('testing.testing_in_testenv_title', this.props.language)}
              </Typography>
              <Typography variant='body1' className={classes.ingress}>
                {getLanguageFromKey('testing.testing_in_testenv_body', this.props.language)}
              </Typography>
            </Grid>

            <Grid item={true} xs={11} sm={11} md={7} className={classes.deployPlaceholderStyle}>

              <DeployPaper
                titleTypographyVariant='h2'
                localRepoInSyncWithMaster={this.returnInSyncStatus(this.props.repoStatus)}
                cSharpCompiles={true}
                masterRepoAndDeployInSync={this.props.deploymentList.at21.items.length > 0 ?
                  this.returnMasterRepoAndDeployInSync('at21', this.props.masterRepoStatus, this.props.deploymentList)
                  :
                  null
                }
                deploySuccess={deploySuccess}
                deployFailedErrorMsg='Some error'
              />

            </Grid>
            <Hidden mdUp={true} smDown={true}>
              <Grid item={true} sm={2}>
                {/* grid padding */}
              </Grid>
            </Hidden>

            <Grid item={true} xs={11} sm={11} md={4} className={classes.aboutServicePlaceholderStyle}>

              <Paper square={true} elevation={1} style={{ padding: 24, maxWidth: 800 }}>
                Placeholder for "Tjenesten i testmiljø"
              </Paper>

            </Grid>
            <Hidden mdUp={true} smDown={true}>
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
      masterRepoStatus: state.deploy.masterRepoStatus,
      deploymentList: state.deploy.deploymentList,
      repoStatus: state.handleMergeConflict.repoStatus,
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(DeployToTestContainer));
