import React from 'react';
import classes from './DeployPage.module.css';
import { DeploymentContainer } from '../containers/DeploymentContainer';
import { InfoCard } from '../components/InfoCard';
import { ReleaseContainer } from '../containers/ReleaseContainer';
import { useDeployPermissionsQuery, useOrgListQuery } from '../../../hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { useInvalidator } from '../../../hooks/useInvalidator';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Link } from '@digdir/designsystemet-react';
import { EmailContactProvider } from 'app-shared/getInTouch/providers';
import { GetInTouchWith } from 'app-shared/getInTouch';
import { StudioError } from '@studio/components';

export function DeployPage() {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();
  const { data: orgs, isPending: orgsIsPending, isError: orgsIsError } = useOrgListQuery();
  const {
    data: permissions,
    isPending: permissionsIsPending,
    isError: permissionsIsError,
  } = useDeployPermissionsQuery(org, app);
  useInvalidator();

  if (orgsIsPending || permissionsIsPending) {
    return (
      <AltinnContentLoader width={1200} height={600} title={t('app_deployment.loading')}>
        <rect x='862' y='3' rx='0' ry='0' width='300' height='600' />
        <rect x='1' y='1' rx='0' ry='0' width='800' height='200' />
        <rect x='1' y='220' rx='0' ry='0' width='800' height='200' />
      </AltinnContentLoader>
    );
  }

  if (orgsIsError || permissionsIsError)
    return (
      <div className={classes.alert}>
        <StudioError>{t('app_deployment.error')}</StudioError>
      </div>
    );

  // If org isn't listed, or doesn't have any environments
  if (!orgs[org] || !orgs[org].environments || !orgs[org].environments.length) {
    const contactByEmail = new GetInTouchWith(new EmailContactProvider());
    return (
      <InfoCard headerText={t('app_deployment.no_env_title')} shadow={true}>
        <div>
          <Trans i18nKey='app_deployment.no_env_1'>
            <Link href={contactByEmail.url('serviceOwner')}> </Link>
          </Trans>
        </div>
        <div style={{ paddingTop: '2.4rem' }}>
          <Trans i18nKey={'app_deployment.no_env_2'}>
            <a target='_new' rel='noopener noreferrer' />
          </Trans>
        </div>
      </InfoCard>
    );
  }

  if (!permissions || !permissions.length) {
    return (
      <InfoCard headerText={t('app_deployment.no_team')} shadow={true}>
        <div style={{ paddingTop: '2.4rem' }}>{t('app_deployment.no_team_info')}</div>
      </InfoCard>
    );
  }

  return (
    <div className={classes.container}>
      <DeploymentContainer />
      <ReleaseContainer />
    </div>
  );
}
