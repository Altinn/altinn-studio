import React from 'react';
import classes from './AppDeployment.module.css';

import { AppDeploymentHeader } from './AppDeploymentHeader';
import { AppDeploymentActions } from './AppDeploymentActions';
import { AppDeploymentList } from './AppDeploymentList';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { BuildResult } from 'app-shared/types/Build';

export interface AppDeploymentProps {
  pipelineDeploymentList: PipelineDeployment[];
  kubernetesDeployment: KubernetesDeployment;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
  orgName: string;
}

export const AppDeployment = ({
  pipelineDeploymentList,
  kubernetesDeployment,
  envName,
  isProduction,
  urlToApp,
  orgName,
}: AppDeploymentProps) => {
  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <AppDeploymentHeader
          kubernetesDeployment={kubernetesDeployment}
          envName={envName}
          isProduction={isProduction}
          urlToApp={urlToApp}
        />
      </div>
      <div className={classes.content}>
        <AppDeploymentActions
          appDeployedVersion={kubernetesDeployment?.version}
          lastBuildId={pipelineDeploymentList[0]?.build?.id}
          inProgress={pipelineDeploymentList.some((item) => item.build.result === BuildResult.none)}
          envName={envName}
          isProduction={isProduction}
          orgName={orgName}
        />
        <AppDeploymentList
          envName={envName}
          isProduction={isProduction}
          pipelineDeploymentList={pipelineDeploymentList}
        />
      </div>
    </div>
  );
};
