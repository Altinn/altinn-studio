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
    content,
    footer,
  }: {
    severity: 'success' | 'warning' | 'info';
    content: string;
    footer: string | JSX.Element;
  }) => {
    return (
      <Alert severity={severity} className={classes.alert}>
        <Heading level={2} size='xsmall' className={classes.header}>
          {envType.toLowerCase() === 'production' ? t('general.production') : envName.toUpperCase()}
        </Heading>
        <div className={classes.content}>{content}</div>
        <div className={classes.footer}>{footer}</div>
      </Alert>
    );
  };

  if (appDeployedAndReachable && !deployInProgress) {
    return (
      <Status
        severity='success'
        content={t('administration.success')}
        footer={
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
        }
      ></Status>
    );
  }

  if (noAppDeployed || (deployFailed && !appDeployedAndReachable)) {
    return (
      <Status
        severity='info'
        content={t('administration.no_app')}
        footer={
          <Trans i18nKey='administration.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  if (deployedVersionNotReachable) {
    return (
      <Status
        severity='warning'
        content={t('administration.unavailable')}
        footer={
          <Trans i18nKey='administration.go_to_build_log'>
            <a href={getReleaseBuildPipelineLink(deploymentInEnv?.build.id)} />
          </Trans>
        }
      />
    );
  }
};
