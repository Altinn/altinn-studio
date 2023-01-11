import React, { useEffect } from 'react';
import classes from './deployPage.module.css';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { ConfigurationActions } from '../../../sharedResources/configuration/configurationSlice';
import { DeployContainerComponent } from '../containers/deployContainer';
import { InfoCard } from './InfoCard';
import { ReleaseContainer } from '../containers/releaseContainer';
import { fetchDeployPermissions } from '../../../sharedResources/user/userSlice';
import { getParsedLanguageFromKey } from 'app-shared/utils/language';
import { useAppDispatch, useAppSelector } from '../../../common/hooks';
import { useParams } from 'react-router-dom';

export function DeployPage() {
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
      <div style={{ height: 'calc(100% - 111px)' }}>
        <AltinnContentLoader width={1200} height={600}>
          <rect x='862' y='3' rx='0' ry='0' width='300' height='600' />
          <rect x='1' y='1' rx='0' ry='0' width='800' height='200' />
          <rect x='1' y='220' rx='0' ry='0' width='800' height='200' />
        </AltinnContentLoader>
      </div>
    );
  }

  // If org isn't listed, or doesn't have any environments
  if (
    !orgs.allOrgs[org] ||
    !orgs.allOrgs[org].environments ||
    !orgs.allOrgs[org].environments.length
  ) {
    return (
      <InfoCard
        headerText={getParsedLanguageFromKey('app_publish.no_env_title', language, [])}
        shadow={true}
      >
        <div>{getParsedLanguageFromKey('app_publish.no_env_1', language, [])}</div>
        <div style={{ paddingTop: '2.4rem' }}>
          {getParsedLanguageFromKey('app_publish.no_env_2', language, [])}
        </div>
      </InfoCard>
    );
  }

  return (
    <div className={classes.container} style={{ height: 'calc(100% - 111px)' }}>
      <div>
        <DeployContainerComponent />
      </div>
      <div>
        <ReleaseContainer />
      </div>
    </div>
  );
}
