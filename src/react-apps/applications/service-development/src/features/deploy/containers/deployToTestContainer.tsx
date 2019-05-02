import { Grid, Hidden, Paper, Typography } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles, WithStyles } from '@material-ui/core/styles';
import * as React from 'react';
import { connect } from 'react-redux';
import altinnTheme from '../../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../../shared/src/utils/language';
import postMessages from '../../../../../shared/src/utils/postMessages';
import { makeGetRepoStatusSelector } from '../../handleMergeConflict/handleMergeConflictSelectors';
import DeployPaper from '../components/deployPaper';
import DeployActionDispatcher from '../deployDispatcher';
import { makeGetCompileStatusResultSelector, makeGetCompileStatusUniqueFilenames } from '../deploySelectors';

const theme = createMuiTheme(altinnTheme);

// TODO: Implement multiple environment support
const environment = 'at21';

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

export enum inSyncStatus {
  ahead = 'ahead',
  behind = 'behind',
  ready = 'ready',
}

export interface IDeployToTestContainerProps extends WithStyles<typeof styles> {
  compileStatus: any;
  compileStatusUniqueFilenames: [];
  deploymentList: any;
  deployStatus: any;
  language: any;
  masterRepoStatus: any;
  repoStatus: any;
}

export class DeployToTestContainer extends
  React.Component<IDeployToTestContainerProps> {

  public interval: any = null;

  constructor(_props: IDeployToTestContainerProps) {
    super(_props);
  }

  public componentDidMount() {
    const { org, service } = window as IAltinnWindow;
    DeployActionDispatcher.fetchDeployments(environment, org, service);
    DeployActionDispatcher.fetchMasterRepoStatus(org, service);
    DeployActionDispatcher.fetchCompileStatus(org, service);
    window.postMessage(postMessages.forceRepoStatusCheck, window.location.href);

    // If deployment has started but not finished, start the fetchDeploymentStatusInterval
    if (this.props.deployStatus[environment].deployStartedSuccess === true &&
      !this.props.deployStatus[environment].result.finishTime
    ) {
      this.fetchDeploymentStatusInterval(environment);

      // Else if deployment is finished, then reset deploymentStatus
    } else if (this.isDeployFinished(environment)) {
      DeployActionDispatcher.resetDeploymentStatus(environment);
    }

  }

  public componentWillUnmount() {
    clearInterval(this.interval);
  }

  public isDeployFinished = (letEnv: string): boolean => {
    if (this.props.deployStatus[letEnv].deployStartedSuccess === true &&
      this.props.deployStatus[letEnv].result.finishTime) {
      return true;
    } else {
      return false;
    }
  }

  public returnInSyncStatus = (repoStatus: any): any => {
    if (repoStatus.contentStatus) {
      if (repoStatus.contentStatus.length > 0) {
        return inSyncStatus.ahead;
      } else if (repoStatus.behindBy > 0) {
        return inSyncStatus.behind;
      } else {
        return inSyncStatus.ready;
      }
    } else {
      return null;
    }
  }

  public isMasterRepoAndDeployInSync = (letEnv: string, masterRepoStatus: any, deploymentList: any): boolean => {
    const image = deploymentList[letEnv].items[0].spec.template.spec.containers[0].image;
    const imageTag = image.split(':')[1];
    if (masterRepoStatus !== null && masterRepoStatus.commit.id === imageTag) {
      return true;
    } else {
      return false;
    }
  }

  public startDeployment = (letEnv: string) => {
    const { org, service } = window as IAltinnWindow;
    DeployActionDispatcher.deployAltinnApp(letEnv, org, service);
    this.fetchDeploymentStatusInterval(letEnv);
  }

  public fetchDeploymentStatusInterval = (letEnv: string) => {
    const { org, service } = window as IAltinnWindow;
    const interval = setInterval(() => {
      DeployActionDispatcher.fetchDeployAltinnAppStatus(
        letEnv, org, service, this.props.deployStatus[letEnv].result.buildId);
      if (this.props.deployStatus[letEnv].result.finishTime ||
        this.props.deployStatus[letEnv].deployStartedSuccess === false) {

        clearInterval(interval);

      }
    }, 5000);
    this.interval = interval;
  }

  public isDeploySuccessful = (deployStatus: any) => {
    if (deployStatus.result.finishTime &&
      deployStatus.result.success === true &&
      deployStatus.result.status === 'completed') {
      return true;
    } else if (deployStatus.result.finishTime &&
      deployStatus.result.success === false &&
      deployStatus.result.status === 'completed') {
      return false;
    } else if (deployStatus.deployStartedSuccess === false) {
      return false;
    } else {
      return null;
    }
  }

  public render() {
    const { classes, compileStatus, language } = this.props;

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
                cSharpCompileStatusSuccess={compileStatus.result && compileStatus.result.succeeded}
                cSharpCompileStatusUniqueFilenames={this.props.compileStatusUniqueFilenames}
                deploymentListFetchStatus={this.props.deploymentList[environment].fetchStatus}
                deployStatus={this.props.deployStatus[environment]}
                deploySuccess={this.isDeploySuccessful(this.props.deployStatus[environment])}
                env={environment}
                language={language}
                localRepoInSyncWithMaster={this.returnInSyncStatus(this.props.repoStatus)}
                masterRepoAndDeployInSync={this.props.deploymentList[environment].items.length > 0 ?
                  this.isMasterRepoAndDeployInSync(
                    environment,
                    this.props.masterRepoStatus,
                    this.props.deploymentList)
                  :
                  null
                }
                onClickStartDeployment={this.startDeployment}
                titleTypographyVariant='h2'
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
  const GetCompileStatusSelector = makeGetCompileStatusResultSelector();
  const GetCompileStatusUniqueFilenames = makeGetCompileStatusUniqueFilenames();
  const GetRepoStatusSelector = makeGetRepoStatusSelector();
  const mapStateToProps = (
    state: IServiceDevelopmentState,
  ) => {
    return {
      language: state.language,
      masterRepoStatus: state.deploy.masterRepoStatus,
      deploymentList: state.deploy.deploymentList,
      repoStatus: GetRepoStatusSelector(state),
      deployStatus: state.deploy.deployStatus,
      compileStatus: GetCompileStatusSelector(state),
      compileStatusUniqueFilenames: GetCompileStatusUniqueFilenames(state),
    };
  };
  return mapStateToProps;
};

export default withStyles(styles)(connect(makeMapStateToProps)(DeployToTestContainer));
