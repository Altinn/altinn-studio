import { Grid, Typography, makeStyles } from '@material-ui/core';
import React from 'react';
import AltinnContentLoader from 'app-shared/components/molecules/AltinnContentLoader';
import AltinnInformationCardForChildren from 'app-shared/components/molecules/AltinnInformationCardForChildren';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import { ConfigurationActions } from '../../../sharedResources/configuration/configurationSlice';
import DeployContainerComponent from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';
import { fetchDeployPermissions } from '../../../sharedResources/user/userSlice';
import { useAppSelector, useAppDispatch } from 'common/hooks';
import type { IAltinnWindow } from '../../../types/global';

const useStyles = makeStyles({
  deployPaper: {
    height: 'calc(100% - 111px)',
  },
  lastNoEnvironmentTextSection: {
    paddingTop: '2.4rem',
  },
});

function DeployPage() {
  const classes = useStyles();
  const { org } = window as Window as IAltinnWindow;
  const dispatch = useAppDispatch();

  const orgs: any = useAppSelector((state) => state.configuration.orgs);
  const language: any = useAppSelector((state) => state.languageState.language);

  React.useEffect(() => {
    dispatch(ConfigurationActions.getOrgs());
    dispatch(fetchDeployPermissions());
  }, [dispatch]);

  const isLoading = (): boolean => {
    return !orgs.allOrgs || !language;
  };

  if (isLoading()) {
    return (
      <Grid item={true} className={classes.deployPaper}>
        <Grid container={true} direction='row' justifyContent='space-between'>
          <Grid item={true} xs={12}>
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
  if (
    !orgs.allOrgs[org] ||
    !orgs.allOrgs[org].environments ||
    !orgs.allOrgs[org].environments.length
  ) {
    return (
      <Grid item={true} className={classes.deployPaper}>
        <Grid container={true} direction='row' justifyContent='space-between'>
          <Grid item={true} xs={12}>
            <AltinnInformationCardForChildren
              headerText={getParsedLanguageFromKey(
                'app_publish.no_env_title',
                language,
                [],
              )}
              imageSource='../../designer/img/illustration-help-2-circle.svg'
              shadow={true}
            >
              <Typography>
                {getParsedLanguageFromKey('app_publish.no_env_1', language, [])}
              </Typography>
              <Typography className={classes.lastNoEnvironmentTextSection}>
                {getParsedLanguageFromKey('app_publish.no_env_2', language, [])}
              </Typography>
            </AltinnInformationCardForChildren>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid item={true} className={classes.deployPaper}>
      <Grid container={true} direction='row' justifyContent='space-between'>
        <Grid item={true} xs={9}>
          <DeployContainerComponent />
        </Grid>
        <Grid item={true} xs={3}>
          <ReleaseContainer />
        </Grid>
      </Grid>
    </Grid>
  );
}
export default DeployPage;
