import React from 'react';
import classes from './deployPage.module.css';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { DeployContainerComponent } from '../containers/deployContainer';
import { InfoCard } from '../components/InfoCard';
import { ReleaseContainer } from '../containers/releaseContainer';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useFrontendLang, useOrgList } from '../contexts/services/queryHooks';
import { useParams } from 'react-router-dom';

export function DeployPage() {
  const { data: orgs = { orgs: {} } } = useOrgList();
  const { data: language = {} } = useFrontendLang('nb');
  const t = (key: string) => getLanguageFromKey(key, language);
  const isLoading = (): boolean => !orgs.orgs || !language;
  const { org } = useParams();
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
  if (!orgs.orgs[org] || !orgs.orgs[org].environments || !orgs.orgs[org].environments.length) {
    return (
      <InfoCard headerText={t('app_publish.no_env_title')} shadow={true}>
        <div>{t('app_publish.no_env_1')}</div>
        <div style={{ paddingTop: '2.4rem' }}>{t('app_publish.no_env_2')}</div>
      </InfoCard>
    );
  }

  return (
    <div className={classes.container} style={{ height: 'calc(100% - 111px)' }}>
      <DeployContainerComponent />
      <ReleaseContainer />
    </div>
  );
}
