import React, { type JSX } from 'react';
import classes from './DeploymentStatus.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Trans, useTranslation } from 'react-i18next';
import {
  StudioLink,
  StudioParagraph,
  StudioSpinner,
  StudioHeading,
  StudioAlert,
} from '@studio/components';
import { DateUtils } from '@studio/pure-functions';
import { publishPath } from 'app-shared/api/paths';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';
import { ExternalLinkIcon } from '@studio/icons';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

export type DeploymentStatusProps = {
  kubernetesDeployment?: KubernetesDeployment;
  deploymentType: PipelineDeployment['deploymentType'];
  isDeploymentInProgress?: boolean;
  lastPublishedDate?: string;
  envName: string;
  isProduction: boolean;
  urlToApp?: string;
};

export const DeploymentStatus = ({
  kubernetesDeployment,
  deploymentType,
  isDeploymentInProgress,
  lastPublishedDate,
  envName,
  isProduction,
  urlToApp,
}: DeploymentStatusProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { t } = useTranslation();

  const formatDateTime = (dateAsString: string): string => {
    return t('general.date_time_format', {
      date: DateUtils.formatDateDDMMYYYY(dateAsString),
      time: DateUtils.formatTimeHHmm(dateAsString),
    });
  };

  const DeploymentStatusAlert = ({
    severity,
    content,
    footer,
  }: {
    severity: 'success' | 'warning' | 'info' | 'danger';
    content: string | React.ReactNode;
    footer: string | JSX.Element;
  }) => {
    const envTitle = isProduction ? t('general.production') : envName.toUpperCase();
    return (
      <StudioAlert data-color={severity} className={classes.alert}>
        <StudioHeading spacing level={2} data-size='xs'>
          {envTitle}
        </StudioHeading>
        {content}
        <StudioParagraph data-size='xs'>{footer}</StudioParagraph>
      </StudioAlert>
    );
  };

  if (isDeploymentInProgress) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={
          <div className={classes.loadingSpinner}>
            <StudioSpinner aria-hidden data-size='xs' />
            {t('app_deployment.status.inProgress')}
          </div>
        }
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  const isUndeploy = deploymentType === 'Decommission';
  if (!kubernetesDeployment || isUndeploy) {
    return (
      <DeploymentStatusAlert
        severity='info'
        content={<StudioParagraph spacing>{t('app_deployment.status.none')}</StudioParagraph>}
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }
  const isDeploy = deploymentType === 'Deploy';
  if (!kubernetesDeployment?.version && isDeploy) {
    return (
      <DeploymentStatusAlert
        severity='warning'
        content={
          <StudioParagraph spacing>{t('app_deployment.status.unavailable')}</StudioParagraph>
        }
        footer={
          <Trans i18nKey='overview.go_to_publish'>
            <a href={publishPath(org, app)} />
          </Trans>
        }
      />
    );
  }

  return (
    <DeploymentStatusAlert
      severity='success'
      content={
        <StudioParagraph spacing>
          <Trans
            i18nKey={'app_deployment.status.succeeded'}
            values={{
              version: kubernetesDeployment.version,
            }}
            components={{
              a: (
                <StudioLink href={urlToApp} rel='noopener noreferrer' target='_blank'>
                  {' '}
                </StudioLink>
              ),
              ext: <ExternalLinkIcon title={t('app_deployment.status.open_app_in_new_window')} />,
            }}
          />
        </StudioParagraph>
      }
      footer={
        lastPublishedDate && (
          <Trans
            i18nKey={'app_deployment.last_published'}
            values={{
              lastPublishedDate: formatDateTime(lastPublishedDate),
            }}
          />
        )
      }
    />
  );
};
