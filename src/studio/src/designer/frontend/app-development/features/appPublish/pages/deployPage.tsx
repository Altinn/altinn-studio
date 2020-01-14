import { createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import AltinnContentLoader from 'app-shared/components/molecules/AltinnContentLoader';
import AltinnInformationCardForChildren from 'app-shared/components/molecules/AltinnInformationCardForChildren';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import ConfigurationActions from '../../../sharedResources/configuration/configurationDispatcher';
import DeployContainer from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';

const styles = createStyles({
  deployPaper: {
    height: 'calc(100% - 111px)',
  },
  lastNoEnvironmentTextSection: {
    paddingTop: '2.4rem',
  },
});
export interface IDeployPaperProps extends WithStyles<typeof styles>, RouteComponentProps {
}
function DeployPage(props: IDeployPaperProps) {
  const { org } = window as Window as IAltinnWindow;
  const { classes } = props;

  const orgs: any = useSelector((state: IServiceDevelopmentState) => state.configuration.orgs);
  const language: any = useSelector((state: IServiceDevelopmentState) => state.language);

  React.useEffect(() => {
    ConfigurationActions.getOrgs();

  }, []);

  const isLoading = (): boolean => {
    return (
      !orgs.allOrgs ||
      !language
    );
  };

  // If loading
  if (isLoading()) {
    return (
      <Grid
        item={true}
        className={classes.deployPaper}
      >
        <Grid
          container={true}
          direction={'row'}
          justify={'space-between'}
        >
          <Grid
            item={true}
            xs={12}
          >
            <AltinnContentLoader width={1200} height={600}>
              <rect x='862' y='3' rx='0' ry='0' width='300' height='600' />
              <rect x='1' y='1' rx='0' ry='0' width='800' height='200' />
              <rect x='1' y='220' rx='0' ry='0' width='800' height='200' />
            </AltinnContentLoader>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  // If org isn't listed, or doesn't have any environments
  if (!orgs.allOrgs[org] || !orgs.allOrgs[org].environments || !orgs.allOrgs[org].environments.length) {
    return (
      <Grid
        item={true}
        className={classes.deployPaper}
      >
        <Grid
          container={true}
          direction={'row'}
          justify={'space-between'}
        >
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInformationCardForChildren
              headerText={getParsedLanguageFromKey('app_publish.no_env_title', language, [])}
              imageSource='../../designer/img/illustration-help-2-circle.svg'
              shadow={true}
            >
              <Typography>
                {getParsedLanguageFromKey('app_publish.no_env_1', language, [])}
              </Typography>
              <Typography
                className={classes.lastNoEnvironmentTextSection}
              >
                {getParsedLanguageFromKey('app_publish.no_env_2', language, [])}
              </Typography>
            </AltinnInformationCardForChildren>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid
      item={true}
      className={classes.deployPaper}
    >
      <Grid
        container={true}
        direction={'row'}
        justify={'space-between'}
      >
        <Grid
          item={true}
          xs={9}
        >
          <DeployContainer />
        </Grid>
        <Grid
          item={true}
          xs={3}
        >
          <ReleaseContainer />
        </Grid>
      </Grid>
    </Grid>
  );
}
export default withStyles(styles)(withRouter(DeployPage));
