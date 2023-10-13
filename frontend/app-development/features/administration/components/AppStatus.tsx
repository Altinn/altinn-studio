import React, { useMemo } from 'react';
import classes from './AppStatus.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery } from 'app-development/hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Heading } from '@digdir/design-system-react';
import { AltinnSpinner } from 'app-shared/components';
import { DeploymentStatus } from 'app-development/features/appPublish/components/appDeploymentComponent';
import { formatDateTime } from 'app-shared/pure/date-format';
import { IDeployment } from 'app-development/sharedResources/appDeployment/types';
import { getReleaseBuildPipelineLink } from 'app-development/utils/urlHelper';
import { publishPath } from 'app-shared/api/paths';

export type AppStatusProps = {
  envName: string;
  envType: string;
};

export const AppStatus = ({ envName, envType }: AppStatusProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const { data: appDeployments = [], isLoading: deploysAreLoading } = useAppDeploymentsQuery(
    org,
    app,
  );

  const deployHistory: IDeployment[] = appDeployments.filter((x) => x.envName === envName);

  const latestDeploy = deployHistory ? deployHistory[0] : null;
  const deploymentInEnv = deployHistory.find((d) => d.deployedInEnv);
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

  const Status = ({
    severity,
    children,
  }: {
    severity: 'success' | 'warning' | 'info';
    children: React.ReactNode;
  }) => {
    return (
      <Alert severity={severity} className={classes.status}>
        <Heading level={2} size='xsmall' className={classes.envName}>
          {envType.toLowerCase() === 'production' ? t('general.production') : envName.toUpperCase()}
        </Heading>
        {children}
      </Alert>
    );
  };

  if (appDeployedAndReachable && !deployInProgress) {
    return (
      <Status severity='success'>
        <div className={classes.content}>{t('administration.success')}</div>
        <div className={classes.info}>
          <Trans
            i18nKey={'administration.last_published'}
            values={{
              lastPublishedDate: formatDateTime(
                deploymentInEnv?.created,
                undefined,
                ` ${t('general.time_prefix')} `,
              ),
            }}
          />
        </div>
      </Status>
    );
  }

  if (noAppDeployed || (deployFailed && !appDeployedAndReachable)) {
    return (
      <Status severity='info'>
        <div className={classes.content}>{t('administration.no_app')}</div>
        <div className={classes.info}>
          <Trans i18nKey='administration.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        </div>
      </Status>
    );
  }

  if (deployedVersionNotReachable) {
    return (
      <Status severity='warning'>
        <div className={classes.content}>{t('administration.unavailable')}</div>
        <div className={classes.info}>
          <Trans i18nKey='administration.go_to_build_log'>
            <a href={getReleaseBuildPipelineLink(deploymentInEnv?.build.id)} />
          </Trans>
        </div>
      </Status>
    );
  }
};
