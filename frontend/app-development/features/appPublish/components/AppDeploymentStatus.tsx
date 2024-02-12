import React from 'react';
import classes from './AppDeploymentStatus.module.css';
import { formatTimeHHmm } from 'app-shared/pure/date-format';
import { getAzureDevopsBuildResultUrl } from '../../../utils/urlHelper';
import { shouldDisplayDeployStatus } from './utils';
import { useTranslation, Trans } from 'react-i18next';
import {
  CheckmarkCircleFillIcon,
  InformationSquareFillIcon,
  XMarkOctagonFillIcon,
} from '@studio/icons';
import { BuildResult } from 'app-shared/types/Build';
import type { PipelineDeployment } from 'app-shared/types/api/PipelineDeployment';

export interface AppDeploymentStatusProps {
  envName: string;
  latestPipelineDeployment?: PipelineDeployment;
}

export const AppDeploymentStatus = ({
  envName,
  latestPipelineDeployment,
}: AppDeploymentStatusProps) => {
  const { t } = useTranslation();

  const getStatusIcon = () => {
    switch (latestPipelineDeployment?.build?.result) {
      case BuildResult.succeeded:
        return <CheckmarkCircleFillIcon className={classes.successIcon} />;
      case BuildResult.partiallySucceeded:
      case BuildResult.none:
        return <InformationSquareFillIcon className={classes.infoIcon} />;
      case BuildResult.canceled:
      case BuildResult.failed:
        <XMarkOctagonFillIcon className={classes.errorIcon} />;
    }
  };

  const getStatus = () => {
    switch (latestPipelineDeployment?.build?.result) {
      case BuildResult.succeeded:
        return t('app_deploy_messages.success', {
          tagName: latestPipelineDeployment?.tagName,
          time: formatTimeHHmm(latestPipelineDeployment?.build?.finished),
          envName,
          createdBy: latestPipelineDeployment?.createdBy,
        });
      case BuildResult.failed:
        return t('app_deploy_messages.failed', {
          tagName: latestPipelineDeployment?.tagName,
          time: formatTimeHHmm(latestPipelineDeployment?.build?.finished),
          envName,
        });
      case BuildResult.canceled:
        return t('app_deploy_messages.canceled', {
          tagName: latestPipelineDeployment?.tagName,
          time: formatTimeHHmm(latestPipelineDeployment?.build?.finished),
          envName,
        });
      case BuildResult.partiallySucceeded:
        return t('app_deploy_messages.partiallySucceeded', {
          tagName: latestPipelineDeployment?.tagName,
          envName,
          time: formatTimeHHmm(latestPipelineDeployment?.build?.finished),
        });
      case BuildResult.none:
        return t('app_deploy_messages.none', {
          tagName: latestPipelineDeployment?.tagName,
          time: formatTimeHHmm(latestPipelineDeployment?.build?.finished),
          envName,
        });
      default:
        return '';
    }
  };

  return (
    <>
      {shouldDisplayDeployStatus(latestPipelineDeployment?.created) && (
        <div className={classes.deployStatusGridContainer}>
          <div className={classes.deploySpinnerGridItem}>{getStatusIcon()}</div>
          <div>
            {getStatus()}{' '}
            <Trans i18nKey={'app_deploy_messages.see_build_log'}>
              <a
                href={getAzureDevopsBuildResultUrl(latestPipelineDeployment?.build?.id)}
                target='_newTab'
                rel='noopener noreferrer'
              />
            </Trans>
          </div>

          {/* {deployPermission && latestDeploy && deployedVersionNotReachable && (
        <Alert severity='danger'>
          <Trans i18nKey={'app_deploy_messages.unable_to_list_deploys'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </Alert>
      )}
      {deployPermission && (deployFailed || mutation.isError) && (
        <Alert severity='danger'>
          <Trans i18nKey={'app_deploy_messages.technical_error_1'}>
            <a href='mailto:tjenesteeier@altinn.no' />
          </Trans>
        </Alert>
      )} */}
        </div>
      )}
    </>
  );
};
