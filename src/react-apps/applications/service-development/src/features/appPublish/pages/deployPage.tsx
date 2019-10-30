import { createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import AltinnContentLoader from '../../../../../shared/src/components/molecules/AltinnContentLoader';
import AltinnInformationCardForChildren from '../../../../../shared/src/components/molecules/AltinnInformationCardForChildren';
import ConfigurationActions from '../../../sharedResources/configuration/configurationDispatcher';
import DeployContainer from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';
import { getParsedLanguageFromKey } from '../../../../../shared/src/utils/language';

const styles = createStyles({
  deployPaper: {
    height: 'calc(100% - 111px)',
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
        {isLoading() &&
          <Grid
            item={true}
            xs={12}
          >
            <AltinnContentLoader  width={1200} height={600}>
              <rect x='862' y='3' rx='0' ry='0' width='300' height='600' />
              <rect x='1' y='1' rx='0' ry='0' width='800' height='200' />
              <rect x='1' y='220' rx='0' ry='0' width='800' height='200' />
            </AltinnContentLoader>
          </Grid>
        }
        {!isLoading() && orgs.allOrgs && orgs.allOrgs[org].environments.length === 0 &&
          <Grid
            item={true}
            xs={12}
          >
            <AltinnInformationCardForChildren
              headerText={getParsedLanguageFromKey('app_publish.no_env_title', language, [])}
              imageSource='../../designer/img/illustration-help-circle.svg'
              shadow={true}
            >
              <Typography>
                {getParsedLanguageFromKey('app_publish.no_env_1', language, [])}
              </Typography>
              <Typography>
                {getParsedLanguageFromKey('app_publish.no_env_2', language, [])}
              </Typography>
            </AltinnInformationCardForChildren>
          </Grid>
        }
        {!isLoading() && orgs.allOrgs && orgs.allOrgs[org].environments.length > 0 &&
          <>
            <Grid
              item={true}
              xs={9}
            >
              <DeployContainer/>
            </Grid>
            <Grid
              item={true}
              xs={3}
            >
              <ReleaseContainer/>
            </Grid>
          </>
        }
      </Grid>
    </Grid>
  );
}
export default withStyles(styles)(withRouter(DeployPage));
