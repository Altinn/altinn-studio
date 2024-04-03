import React from 'react';
import classes from './deployPage.module.css';
import { DeployContainerComponent } from '../containers/deployContainer';
import { InfoCard } from '../components/InfoCard';
import { ReleaseContainer } from '../containers/releaseContainer';
import { useDeployPermissionsQuery, useOrgListQuery } from '../../../hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { useInvalidator } from '../../../hooks/useInvalidator';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export function DeployPage() {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();
  const { data: orgs = { orgs: {} }, isPending: isOrgsPending } = useOrgListQuery();
  const { data: permissions, isPending: isPermissionsPending } = useDeployPermissionsQuery(
    org,
    app,
  );
  useInvalidator();
  if (isOrgsPending || isPermissionsPending) {
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
        <div>
          <Trans i18nKey={'app_publish.no_env_1'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </div>
        <div style={{ paddingTop: '2.4rem' }}>
          <Trans i18nKey={'app_publish.no_env_2'}>
            <a target='_new' rel='noopener noreferrer' />
          </Trans>
        </div>
      </InfoCard>
    );
  }

  if (!permissions || !permissions.length) {
    return (
      <InfoCard headerText={t('app_publish.no_team')} shadow={true}>
        <div style={{ paddingTop: '2.4rem' }}>{t('app_publish.no_team_info')}</div>
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
