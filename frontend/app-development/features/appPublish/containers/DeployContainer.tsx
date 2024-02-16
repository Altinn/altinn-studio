import React, { useMemo } from 'react';
import classes from './DeployContainer.module.css';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { BuildResult } from 'app-shared/types/Build';
import {
  useOrgListQuery,
  useEnvironmentsQuery,
  useDeployPermissionsQuery,
  useAppReleasesQuery,
  useAppDeploymentsQuery,
} from '../../../hooks/queries';
import { formatDateTime } from 'app-shared/pure/date-format';
import type { DeployEnvironment } from 'app-shared/types/DeployEnvironment';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import type { ImageOption } from '../components/ImageOption';
import { AppDeployment } from '../components/AppDeployment';
import { Alert } from '@digdir/design-system-react';
import { Trans } from 'react-i18next';

export const DeployContainer = () => {
  const { org, app } = useStudioUrlParams();

  const { data: appDeployment, isPending: isDeploysPending } = useAppDeploymentsQuery(org, app);

  const { data: environmentList = [], isPending: isEnvPending } = useEnvironmentsQuery();
  const { data: releases = [], isPending: isReleasesPending } = useAppReleasesQuery(org, app);
  const { data: orgs = { orgs: {} }, isPending: isOrgsPending } = useOrgListQuery();
  const { data: permissions, isPending: isPermissionsPending } = useDeployPermissionsQuery(
    org,
    app,
  );

  const isPending =
    isReleasesPending || isOrgsPending || isPermissionsPending || isEnvPending || isDeploysPending;

  const orgName: string = useMemo(() => {
    let name = '';
    if (orgs.orgs && orgs.orgs[org]) {
      name = orgs.orgs[org].name.nb;
    }
    return name;
  }, [org, orgs]);

  const deployEnvironments: DeployEnvironment[] = useMemo(
    () =>
      orgs?.orgs[org]?.environments
        .map((envName: string) =>
          environmentList.find((env: DeployEnvironment) => env.name === envName),
        )
        .filter((element: any) => element != null),
    [orgs, org, environmentList],
  );

  const imageOptions: ImageOption[] = useMemo(
    () =>
      releases
        .filter((image) => image.build.result === BuildResult.succeeded)
        .map((image) => ({
          value: image.tagName,
          label: `Version ${image.tagName} (${formatDateTime(image.created)})`,
        })),
    [releases],
  );

  if (isPending) {
    return (
      <div className={classes.deployContainer}>
        <AltinnContentLoader width={900} height={320}>
          <rect x='60' y='13' rx='0' ry='0' width='650' height='76' />
          <rect x='60' y='110' rx='0' ry='0' width='333' height='44' />
          <rect x='60' y='171' rx='0' ry='0' width='202' height='41' />
          <rect x='487' y='111' rx='0' ry='0' width='220' height='42' />
        </AltinnContentLoader>
      </div>
    );
  }

  return (
    <div className={classes.deployContainer}>
      {deployEnvironments.map((env: DeployEnvironment, index: number) => {
        const pipelineDeploymentList = appDeployment.pipelineDeploymentList.filter(
          (item) => item.envName.toLowerCase() === env.name.toLowerCase(),
        );
        const kubernetesDeployment = appDeployment.kubernetesDeploymentList.find(
          (item) => item.envName.toLowerCase() === env.name.toLowerCase(),
        );
        return (
          <AppDeployment
            key={index}
            envName={env.name}
            envType={env.type}
            urlToApp={`https://${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            urlToAppLinkTxt={`${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            imageOptions={imageOptions}
            pipelineDeploymentList={pipelineDeploymentList}
            kubernetesDeployment={kubernetesDeployment}
            deployPermission={
              permissions.findIndex((e) => e.toLowerCase() === env.name.toLowerCase()) > -1
            }
            orgName={orgName}
          />
        );
      })}
    </div>
  );
};
