import React from 'react';
import classes from './AppDeploymentHeader.module.css';
import { Alert, Heading, Link } from '@digdir/design-system-react';
import classNames from 'classnames';
import { Trans, useTranslation } from 'react-i18next';
import { KubernetesDeploymentStatus } from 'app-shared/types/api/KubernetesDeploymentStatus';
import { formatDateTime } from 'app-shared/pure/date-format';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';
import { BuildResult } from 'app-shared/types/Build';
import { StudioSpinner } from '@studio/components';
import type { KubernetesDeployment } from 'app-shared/types/api/KubernetesDeployment';

export interface AppDeploymentHeaderProps {
  kubernetesDeployment?: KubernetesDeployment;
  latestPipelineDeployment?: PipelineDeployment;
  envName: string;
  envType: string;
  urlToApp?: string;
  urlToAppLinkTxt?: string;
}

export const AppDeploymentHeader = ({
  kubernetesDeployment,
  latestPipelineDeployment,
  envName,
  envType,
  urlToApp,
  urlToAppLinkTxt,
}: AppDeploymentHeaderProps) => {
  const { t } = useTranslation();

  const isProduction = envType.toLowerCase() === 'production';
  const headingText = isProduction ? t('general.production') : envName;

  const kubernetesDeploymentStatus = kubernetesDeployment?.status;

  const getStatus = () => {
    if (!kubernetesDeploymentStatus) {
      return t('overview.no_app');
    }

    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.completed:
        return (
          <div>
            <Trans
              i18nKey={'overview.success'}
              values={{
                version: kubernetesDeployment.version,
              }}
              components={{
                a: <Link href={urlToApp}> </Link>,
              }}
            />
            {/*
            <div>
              <Trans
                i18nKey={'overview.last_published'}
                values={{
                  lastPublishedDate: formatDateTime(appDe?.created),
                }}
              />
            </div>
            */}
          </div>
        );
      case KubernetesDeploymentStatus.failed:
        return t('overview.unavailable');
      default:
        return (
          <StudioSpinner
            size='small'
            spinnerTitle={t('overview.in_progress')}
            showSpinnerTitle
            className={classes.loadingSpinner}
          />
        );
    }
  };

  const getSeverity = () => {
    switch (kubernetesDeploymentStatus) {
      case KubernetesDeploymentStatus.completed:
        return 'success';
      case KubernetesDeploymentStatus.failed:
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <Alert severity={getSeverity()} className={classNames(classes.headingContainer)}>
      <Heading spacing level={2} size='xsmall' className={classes.envTitle}>
        {headingText}
      </Heading>
      <div>{getStatus()}</div>
    </Alert>
  );
};
