import React, { useMemo } from 'react';
import classes from './deployContainer.module.css';
import type { IAppClusterState } from '../../../sharedResources/appCluster/appClusterSlice';
import { AltinnContentLoader } from 'app-shared/components/molecules/AltinnContentLoader';
import { AppDeploymentComponent, ImageOption } from '../components/appDeploymentComponent';
import { BuildResult } from '../../../sharedResources/appRelease/types';
import { useAppSelector } from '../../../common/hooks';
import { useParams } from 'react-router-dom';
import {
  useAppDeployments,
  useAppReleases,
  useDeployPermissions,
  useEnvironments,
  useFrontendLang,
  useOrgList,
} from '../hooks/query-hooks';
import { ICreateAppDeploymentEnvObject } from '../../../sharedResources/appDeployment/types';
import { formatDateTime } from 'app-shared/pure/date-format';

export const DeployContainerComponent = () => {
  const { org, app } = useParams();
  const appCluster: IAppClusterState = useAppSelector((state) => state.appCluster);
  const createAppDeploymentErrors: any = useAppSelector(
    (state) => state.appDeployments.createAppDeploymentErrors
  );

  const { data: appDeployments, isLoading: deploymentsAreLoading } = useAppDeployments(org, app);
  const { data: environmentList = [], isLoading: envIsLoading } = useEnvironments();
  const { data: releases = [], isLoading: releasesIsLoading } = useAppReleases(org, app);
  const { data: orgs = { orgs: {} }, isLoading: orgsIsLoading } = useOrgList();
  const { data: language = {}, isLoading: languageIsLoading } = useFrontendLang('nb');
  const { data: permissions, isLoading: permissionsIsLoading } = useDeployPermissions(org, app);

  const isLoading = () =>
    releasesIsLoading ||
    orgsIsLoading ||
    languageIsLoading ||
    permissionsIsLoading ||
    envIsLoading ||
    deploymentsAreLoading;

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
        .map((envName: string) => environmentList.find((env: any) => env.name === envName))
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
      {deployEnvironments.map((envObj: ICreateAppDeploymentEnvObject) => {
        return (
          <AppDeploymentComponent
            key={envObj.name}
            envObj={envObj}
            urlToApp={`https://${org}.${envObj.appPrefix}.${envObj.hostname}/${org}/${app}/`}
            urlToAppLinkTxt={`${org}.${envObj.appPrefix}.${envObj.hostname}/${org}/${app}/`}
            deploymentList={
              appCluster.deploymentList &&
              appCluster.deploymentList.find((elem: any) => elem.env === envObj.name)
            }
            imageOptions={imageOptions}
            deployHistory={appDeployments.filter((x) => x.envName === envObj.name)}
            deployError={createAppDeploymentErrors.filter((x) => x.env === envObj.name)}
            language={language}
            deployPermission={
              permissions.findIndex((e) => e.toLowerCase() === envObj.name.toLowerCase()) > -1
            }
            orgName={orgName}
          />
        );
      })}
    </div>
  );
};
