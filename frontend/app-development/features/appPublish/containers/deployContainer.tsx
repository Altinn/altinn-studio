import React, { useMemo } from 'react';
import classes from './deployContainer.module.css';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { AppDeploymentComponent, ImageOption } from '../components/appDeploymentComponent';
import { BuildResult } from 'app-shared/types/Build';
import { useAppSelector } from '../../../hooks';
import { useParams } from 'react-router-dom';
import {
  useOrgListQuery,
  useEnvironmentsQuery,
  useDeployPermissionsQuery,
  useAppReleasesQuery,
  useAppDeploymentsQuery,
} from '../../../hooks/queries';
import {
  ICreateAppDeploymentEnvObject,
  IDeployment,
} from '../../../sharedResources/appDeployment/types';
import { formatDateTime } from 'app-shared/pure/date-format';
import { DeployEnvironment } from 'app-shared/types/DeployEnvironment';

export const DeployContainerComponent = () => {
  const { org, app } = useParams();
  const createAppDeploymentErrors: any = useAppSelector(
    (state) => state.appDeployments.createAppDeploymentErrors
  );

  const { data: appDeployments = [], isLoading: deploysAreLoading } = useAppDeploymentsQuery(org, app);
  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironmentsQuery();
  const { data: releases = [], isLoading: releasesIsLoading } = useAppReleasesQuery(org, app);
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgListQuery();
  const { data: permissions, isLoading: permissionsIsLoading } = useDeployPermissionsQuery(org, app);

  const isLoading = () =>
    releasesIsLoading || orgsIsLoading || permissionsIsLoading || envIsLoading || deploysAreLoading;

  const orgName: string = useMemo(() => {
    let name = '';
    if (orgs.orgs && orgs.orgs[org]) {
      name = orgs.orgs[org].name.nb;
    }
    return name;
  }, [org, orgs]);

  const deployEnvironments: ICreateAppDeploymentEnvObject[] = useMemo(
    () =>
      orgs?.orgs[org]?.environments
        .map((envName: string) =>
          environmentList.find((env: DeployEnvironment) => env.name === envName)
        )
        .filter((element: any) => element != null),
    [orgs, org, environmentList]
  );

  const imageOptions: ImageOption[] = useMemo(
    () =>
      releases
        .filter((image) => image.build.result === BuildResult.succeeded)
        .map((image) => ({
          value: image.tagName,
          label: `Version ${image.tagName} (${formatDateTime(image.created)})`,
        })),
    [releases]
  );

  if (isLoading()) {
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
        const deploymentsInEnv: IDeployment[] = appDeployments.filter(
          (x) => x.envName === env.name
        );
        return (
          <AppDeploymentComponent
            key={index}
            envName={env.name}
            urlToApp={`https://${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            urlToAppLinkTxt={`${org}.${env.appPrefix}.${env.hostname}/${org}/${app}/`}
            imageOptions={imageOptions}
            deployHistory={deploymentsInEnv}
            deployError={createAppDeploymentErrors.filter((x) => x.env === env.name)}
            deployPermission={
              permissions.findIndex((e) => e.toLowerCase() === env.name.toLowerCase()) > -1
            }
            orgName={orgName}
            showLinkToApp={
              deploymentsInEnv.length > 0 &&
              deploymentsInEnv[0].deployedInEnv &&
              deploymentsInEnv[0].build.result === BuildResult.succeeded
            }
          />
        );
      })}
    </div>
  );
};
