import type { HTMLAttributes } from 'react';
import React from 'react';
import {
  useAppDeploymentsQuery,
  useEnvironmentsQuery,
  useOrgListQuery,
} from 'app-development/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { Alert } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { AppEnvironments } from './AppEnvironments';
import { AppLogs } from './AppLogs';
import { StudioSpinner } from '@studio/components';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';

type AppProps = Pick<HTMLAttributes<HTMLDivElement>, 'className'>;

export const AppDeployments = ({ className }: AppProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: environmentList = [],
    isPending: environmentListIsPending,
    isError: environmentListIsError,
  } = useEnvironmentsQuery({ hideDefaultError: true });
  const {
    data: orgs,
    isPending: orgsIsPending,
    isError: orgsIsError,
  } = useOrgListQuery({ hideDefaultError: true });
  const {
    data: appDeployment,
    isPending: appDeploymentIsPending,
    isError: appDeploymentIsError,
  } = useAppDeploymentsQuery(org, app, { hideDefaultError: true });

  if (environmentListIsPending || orgsIsPending || appDeploymentIsPending)
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.app_loading')} />;

  if (environmentListIsError || orgsIsError || appDeploymentIsError)
    return <Alert severity='danger'>{t('overview.app_error')}</Alert>;

  const selectedOrg = orgs?.[org];
  const orgEnvironmentList: DeployEnvironment[] = environmentList.filter((env: DeployEnvironment) =>
    selectedOrg.environments.some((envName) => envName.toLowerCase() === env.name.toLowerCase()),
  );

  return (
    <>
      <section className={className}>
        <AppEnvironments orgEnvironmentList={orgEnvironmentList} appDeployment={appDeployment} />
      </section>
      <section className={className}>
        <AppLogs orgEnvironmentList={orgEnvironmentList} appDeployment={appDeployment} />
      </section>
    </>
  );
};
