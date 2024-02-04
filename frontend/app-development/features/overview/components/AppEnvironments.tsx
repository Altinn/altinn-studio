import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useEnvironmentsQuery, useOrgListQuery } from 'app-development/hooks/queries';
import { StudioSpinner } from '@studio/components';
import type { ICreateAppDeploymentEnvObject } from 'app-development/sharedResources/appDeployment/types';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { AppStatus } from './AppStatus';
import { Alert } from '@digdir/design-system-react';
import { NoEnvironmentsAlert } from './NoEnvironmentsAlert';
import classes from './AppEnvironments.module.css';

export const AppEnvironments = () => {
  const { org } = useStudioUrlParams();
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

  if (envIsPending || orgsIsPending) return <StudioSpinner />;

  if (envIsError || orgsIsError)
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
            envName={orgEnvironment.name}
            envType={orgEnvironment.type}
          />
        );
      })}
    </div>
  );
};
