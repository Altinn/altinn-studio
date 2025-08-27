import type { HTMLAttributes } from 'react';
import React from 'react';
import {
  useAppDeploymentsQuery,
  useEnvironmentsQuery,
  useOrgListQuery,
} from '../../../../../hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTranslation } from 'react-i18next';
import { DeploymentStatusList } from './DeploymentStatusList';
import { DeploymentLogList } from './DeploymentLogList';
import { StudioError, StudioSpinner } from 'libs/studio-components-legacy/src';
import type { Environment } from 'app-shared/types/Environment';

type DeploymentContainerProps = Pick<HTMLAttributes<HTMLDivElement>, 'className'>;

export const DeploymentContainer = ({ className }: DeploymentContainerProps) => {
  const { org, app } = useStudioEnvironmentParams();
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
    return (
      <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.deployments_loading')} />
    );

  if (environmentListIsError || orgsIsError || appDeploymentIsError)
    return <StudioError>{t('overview.deployments_error')}</StudioError>;

  const selectedOrg = orgs?.[org];
  const orgEnvironmentList: Environment[] = environmentList.filter((env: Environment) =>
    selectedOrg.environments.some((envName) => envName.toLowerCase() === env.name.toLowerCase()),
  );

  return (
    <>
      <section className={className}>
        <DeploymentStatusList
          orgEnvironmentList={orgEnvironmentList}
          kubernetesDeploymentList={appDeployment.kubernetesDeploymentList}
          pipelineDeploymentList={appDeployment.pipelineDeploymentList}
        />
      </section>
      <section className={className}>
        <DeploymentLogList
          orgEnvironmentList={orgEnvironmentList}
          pipelineDeploymentList={appDeployment.pipelineDeploymentList}
        />
      </section>
    </>
  );
};
