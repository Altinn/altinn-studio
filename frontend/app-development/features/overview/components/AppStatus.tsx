import React, { useMemo } from 'react';
import classes from './AppStatus.module.css';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppDeploymentsQuery } from 'app-development/hooks/queries';
import { Trans, useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';
import { StudioSpinner } from '@studio/components';
import { formatDateDDMMYY, formatTimeHHmm } from 'app-shared/pure/date-format';
import { getAzureDevopsBuildResultUrl } from 'app-development/utils/urlHelper';
import { publishPath } from 'app-shared/api/paths';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { BuildResult, BuildStatus } from 'app-shared/types/Build';

export type AppStatusProps = {
  envName: string;
  envType: string;
};

export const AppStatus = ({ envName, envType }: AppStatusProps) => {
  const { org, app } = useStudioUrlParams();
  const { t } = useTranslation();

  const {
    data: appDeployment,
    isPending: isPendingDeploys,
    isError: deploysAreError,
  } = useAppDeploymentsQuery(org, app, { hideDefaultError: true });

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: formatDateDDMMYY(dateAsString),
      time: formatTimeHHmm(dateAsString),
    });
  };

  if (isPendingDeploys)
    return <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('overview.loading_deploys')} />;

  if (deploysAreError)
    return (
      <Alert severity='danger'>
        <Trans
          i18nKey={'overview.app_status_error'}
          values={{
            envName,
          }}
        />
      </Alert>
    );

  const kubernetesDeployment = appDeployment?.kubernetesDeploymentList.find(
    (item) => item.envName.toLowerCase() === envName.toLowerCase(),
  );

  if (!kubernetesDeployment?.status) {
    return (
      <DeploymentStatusInfo
        envType={envType}
        envName={envName}
        severity='info'
        content={t('overview.no_app')}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  if (!kubernetesDeployment.status) {
    return (
      <DeploymentStatusInfo
        envType={envType}
        envName={envName}
        severity='info'
        content={t('overview.no_app')}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  switch (kubernetesDeployment.status) {
    case KubernetesDeploymentStatus.completed:
      // TODO - remove and replace by kubernetes date
      const deploymentSucceeded = appDeployment?.pipelineDeploymentList.find(
        (item) =>
          item.tagName.toLowerCase() === kubernetesDeployment.version.toLowerCase() &&
          (item.build.result === BuildResult.succeeded ||
            item.build.result === BuildResult.partiallySucceeded) &&
          item.build.finished !== null,
      );
      return (
        <DeploymentStatusInfo
          envType={envType}
          envName={envName}
          severity='success'
          content={t('overview.success')}
          footer={
            <Trans
              i18nKey={'overview.last_published'}
              values={{
                lastPublishedDate: formatDateTime(deploymentSucceeded?.created),
              }}
            />
          }
        />
      );
    case KubernetesDeploymentStatus.failed:
      // TODO - remove and replace by a link to the publish page
      const deploymentFailed = appDeployment?.pipelineDeploymentList.find(
        (item) =>
          item.tagName.toLowerCase() === kubernetesDeployment.version.toLowerCase() &&
          item.build.result === BuildResult.failed,
      );
      return (
        <DeploymentStatusInfo
          envType={envType}
          envName={envName}
          severity='warning'
          content={t('overview.unavailable')}
          footer={
            <Trans i18nKey='overview.go_to_build_log'>
              <a href={getAzureDevopsBuildResultUrl(deploymentFailed?.build.id)} />
            </Trans>
          }
        />
      );
    default:
      return (
        <DeploymentStatusInfo
          envType={envType}
          envName={envName}
          severity='info'
          content={
            <StudioSpinner
              size='small'
              spinnerText={t('overview.in_progress')}
              className={classes.loadingSpinner}
            />
          }
          footer={
            <Trans i18nKey='overview.go_to_publish'>
              <a href={publishPath(org, app)} />
            </Trans>
          }
        />
      );
  }
};

type DeploymentStatusInfoProps = {
  envType: string;
  envName: string;
  severity: 'success' | 'warning' | 'info';
  content: string | React.ReactNode;
  footer: string | JSX.Element;
};
const DeploymentStatusInfo = ({
  envType,
  envName,
  severity,
  content,
  footer,
}: DeploymentStatusInfoProps) => {
  const { t } = useTranslation();
  const isProduction = envType.toLowerCase() === 'production';
  const headingText = isProduction ? t('general.production') : envName;

  return (
    <Alert severity={severity} className={classes.alert}>
      <Heading spacing level={2} size='xsmall' className={classes.heading}>
        {headingText}
      </Heading>
      <Paragraph spacing size='small'>
        {content}
      </Paragraph>
      <Paragraph size='xsmall'>{footer}</Paragraph>
    </Alert>
  );
};
