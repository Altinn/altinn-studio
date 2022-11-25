import React, { useEffect } from 'react';
import { Grid, Typography } from '@mui/material';
import AltinnContentLoader from 'app-shared/components/molecules/AltinnContentLoader';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import { ConfigurationActions } from '../../../sharedResources/configuration/configurationSlice';
import DeployContainerComponent from '../containers/deployContainer';
import ReleaseContainer from '../containers/releaseContainer';
import { fetchDeployPermissions } from '../../../sharedResources/user/userSlice';
import { useParams } from 'react-router-dom';
import { InfoCard } from './InfoCard';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';

function DeployPage() {
  const { org } = useParams();
  const dispatch = useAppDispatch();
  const orgs: any = useAppSelector((state) => state.configuration.orgs);
  const language: any = useAppSelector((state) => state.languageState.language);

  useEffect(() => {
    dispatch(ConfigurationActions.getOrgs());
    dispatch(fetchDeployPermissions());
  }, [dispatch]);

  const isLoading = (): boolean => {
    return !orgs.allOrgs || !language;
  };

  if (isLoading()) {
    return (
      <Grid item={true} sx={{ height: 'calc(100% - 111px)' }}>
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
      <Grid item={true} sx={{ height: 'calc(100% - 111px)' }}>
        <Grid container={true} direction='row' justifyContent='space-between'>
          <Grid item={true} xs={12}>
            <InfoCard
              headerText={getParsedLanguageFromKey('app_publish.no_env_title', language, [])}
              shadow={true}
            >
              <Typography>
                {getParsedLanguageFromKey('app_publish.no_env_1', language, [])}
              </Typography>
              <Typography sx={{ paddingTop: '2.4rem' }}>
                {getParsedLanguageFromKey('app_publish.no_env_2', language, [])}
              </Typography>
            </InfoCard>
          </Grid>
        </Grid>
      </Grid>
    );
  }

  return (
    <Grid item={true} sx={{ height: 'calc(100% - 111px)' }}>
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
