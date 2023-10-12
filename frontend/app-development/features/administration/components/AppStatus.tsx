import React, { useMemo } from 'react';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { DeploymentStatus } from 'app-development/features/appPublish/components/appDeploymentComponent';
import { formatTimeHHmm } from 'app-shared/pure/date-format';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';

export type AppStatusProps = {
  envName: string;
};

export const AppStatus = ({ envName }: AppStatusProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: appDeployments = [], isLoading: deploysAreLoading } = useAppDeploymentsQuery(
    org,
    app,
  );

  const deployHistory: IDeployment[] = appDeployments.filter((x) => x.envName === envName);

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory ? deployHistory.find((d) => d.deployedInEnv) : false;
  const { deployInProgress, deploymentStatus } = useMemo(() => {
    if (latestDeploy && latestDeploy.build.finished === null) {
      return { deployInProgress: true, deploymentStatus: DeploymentStatus.inProgress };
    } else if (latestDeploy && latestDeploy.build.finished && latestDeploy.build.result) {
      return { deployInProgress: false, deploymentStatus: latestDeploy.build.result };
    } else {
      return { deployInProgress: false, deploymentStatus: null };
    }
  }, [latestDeploy]);

  const appDeployedAndReachable = !!deploymentInEnv;
  const deployFailed = latestDeploy && deploymentStatus === DeploymentStatus.failed;
  const deployedVersionNotReachable =
    latestDeploy && !appDeployedAndReachable && deploymentStatus === DeploymentStatus.succeeded;
  const noAppDeployed = !latestDeploy || deployInProgress;

  if (deploysAreLoading) return <AltinnSpinner />;

  if (appDeployedAndReachable && !deployInProgress) {
    return (
      <Alert severity='success'>
        {t('administration.success', {
          tagName: deploymentInEnv?.tagName,
          time: formatTimeHHmm(deploymentInEnv?.build.finished),
          createdBy: deploymentInEnv?.createdBy,
        })}
      </Alert>
    );
  }

  if (noAppDeployed || (deployFailed && !appDeployedAndReachable)) {
    return <Alert severity='info'>{t('administration.no_app')}</Alert>;
  }

  if (deployedVersionNotReachable) {
    return <Alert severity='warning'>{t('administration.unavailable')}</Alert>;
  }
};
