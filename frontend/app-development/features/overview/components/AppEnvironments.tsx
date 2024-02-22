import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import {
  useAppDeploymentsQuery,
  useEnvironmentsQuery,
  useOrgListQuery,
} from 'app-development/hooks/queries';
import { StudioSpinner } from '@studio/components';
import type { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { AppStatus } from './AppStatus';
import { Alert } from '@digdir/design-system-react';
import { NoEnvironmentsAlert } from './NoEnvironmentsAlert';
import classes from './AppEnvironments.module.css';
import { getAppLink } from 'app-shared/ext-urls';

export const AppEnvironments = () => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: environmentList = [],
    isPending: envIsPending,
    isError: envIsError,
  } = useEnvironmentsQuery({ hideDefaultError: true });
  const {
    data: orgs = { orgs: {} },
    isPending: orgsIsPending,
    isError: orgsIsError,
  } = useOrgListQuery({ hideDefaultError: true });
  const {
    data: appDeployment,
    isPending: isPendingDeploys,
    isError: deploysAreError,
  } = useAppDeploymentsQuery(org, app, { hideDefaultError: true });

  if (envIsPending || orgsIsPending || isPendingDeploys)
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.loading_env')} />;

  if (envIsError || orgsIsError || deploysAreError)
    return <Alert severity='danger'>{t('overview.app_environments_error')}</Alert>;

  const selectedOrg = orgs.orgs[org];
  const hasNoEnvironments = !(selectedOrg?.environments?.length ?? 0);

  if (hasNoEnvironments) {
    return <NoEnvironmentsAlert />;
  }

  const orgEnvironments: ICreateAppDeploymentEnvObject[] = environmentList.filter(
    (env: DeployEnvironment) => selectedOrg.environments.includes(env.name),
  );

  return (
    <div className={classes.appEnvironments}>
      {orgEnvironments.map((orgEnvironment: DeployEnvironment) => {
        return (
          <AppStatus
            key={orgEnvironment.name}
            appDeployment={appDeployment}
            envName={orgEnvironment.name}
            envType={orgEnvironment.type}
            urlToApp={getAppLink(orgEnvironment.appPrefix, orgEnvironment.hostname, org, app)}
          />
        );
      })}
    </div>
  );
};
