import React, { useState } from 'react';
import classes from './DeployDropdown.module.css';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioSpinner } from '@studio/components';
import { Button, Select } from '@digdir/design-system-react';
import { DeploymentStatus, ImageOption } from '../appDeploymentComponent';
import { formatTimeHHmm } from 'app-shared/pure/date-format';
import { getAzureDevopsBuildResultUrl } from '../../../../utils/urlHelper';
import { shouldDisplayDeployStatus } from './utils';
import { useTranslation, Trans } from 'react-i18next';
import {
  CheckmarkCircleFillIcon,
  InformationSquareFillIcon,
  XMarkOctagonFillIcon,
} from '@studio/icons';

export interface DeployDropdownProps {
  appDeployedVersion: string;
  envName: string;
  imageOptions: ImageOption[];
  disabled: boolean;
  deployHistoryEntry: any;
  deploymentStatus: DeploymentStatus | string | number;
  setSelectedImageTag: (tag) => void;
  selectedImageTag: string;
  startDeploy: any;
}

export const DeployDropdown = ({
  appDeployedVersion,
  imageOptions,
  envName,
  deploymentStatus,
  deployHistoryEntry,
  selectedImageTag,
  setSelectedImageTag,
  disabled,
  startDeploy,
}: DeployDropdownProps) => {
  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();
  const { t } = useTranslation();
  const onStartDeployClick = async () => {
    await startDeploy();
  };
  return (
    <>
      <div>{t('app_deploy_messages.choose_version')}</div>
      <div className={classes.select} id={`deploy-select-${envName.toLowerCase()}`}>
        {imageOptions.length > 0 && (
          <Select
            key={imageOptions.length}
            options={imageOptions || []}
            onChange={(value: string) => setSelectedImageTag(value)}
          />
        )}
      </div>
      <div className={classes.deployButton}>
        <AltinnConfirmDialog
          open={isConfirmDeployDialogOpen}
          confirmColor='first'
          onConfirm={onStartDeployClick}
          onClose={() => setIsConfirmDeployDialogOpen(false)}
          placement='right'
          trigger={
            <Button
              disabled={disabled}
              onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
              id={`deploy-button-${envName.toLowerCase()}`}
              size='small'
            >
              {t('app_deploy_messages.btn_deploy_new_version')}
            </Button>
          }
        >
          <p>
            {appDeployedVersion
              ? t('app_deploy_messages.deploy_confirmation', {
                  selectedImageTag,
                  appDeployedVersion,
                })
              : t('app_deploy_messages.deploy_confirmation_short', { selectedImageTag })}
          </p>
        </AltinnConfirmDialog>
      </div>
      {shouldDisplayDeployStatus(deployHistoryEntry?.created) && (
        <div className={classes.deployStatusGridContainer}>
          <div className={classes.deploySpinnerGridItem}>
            {deploymentStatus === DeploymentStatus.inProgress && <StudioSpinner />}
            {deploymentStatus === DeploymentStatus.succeeded && (
              <CheckmarkCircleFillIcon className={classes.successIcon} />
            )}
            {(deploymentStatus === DeploymentStatus.partiallySucceeded ||
              deploymentStatus === DeploymentStatus.none) && (
              <InformationSquareFillIcon className={classes.infoIcon} />
            )}
            {(deploymentStatus === DeploymentStatus.canceled ||
              deploymentStatus === DeploymentStatus.failed) && (
              <XMarkOctagonFillIcon className={classes.errorIcon} />
            )}
          </div>
          <div>
            {deploymentStatus === DeploymentStatus.inProgress &&
              t('app_deploy_messages.deploy_in_progress', {
                createdBy: deployHistoryEntry?.createdBy,
                tagName: deployHistoryEntry?.tagName,
              })}
            {deploymentStatus === DeploymentStatus.succeeded &&
              t('app_deploy_messages.success', {
                tagName: deployHistoryEntry?.tagName,
                time: formatTimeHHmm(deployHistoryEntry?.build.finished),
                envName,
                createdBy: deployHistoryEntry?.createdBy,
              })}
            {deploymentStatus === DeploymentStatus.failed &&
              t('app_deploy_messages.failed', {
                tagName: deployHistoryEntry?.tagName,
                time: formatTimeHHmm(deployHistoryEntry?.build.finished),
                envName,
              })}
            {deploymentStatus === DeploymentStatus.canceled &&
              t('app_deploy_messages.canceled', {
                tagName: deployHistoryEntry?.tagName,
                time: formatTimeHHmm(deployHistoryEntry?.build.finished),
                envName,
              })}
            {deploymentStatus === DeploymentStatus.partiallySucceeded &&
              t('app_deploy_messages.partiallySucceeded', {
                tagName: deployHistoryEntry?.tagName,
                envName,
                time: formatTimeHHmm(deployHistoryEntry?.build.finished),
              })}
            {deploymentStatus === DeploymentStatus.none &&
              t('app_deploy_messages.none', {
                tagName: deployHistoryEntry?.tagName,
                time: formatTimeHHmm(deployHistoryEntry?.build.finished),
                envName,
              })}{' '}
            <Trans i18nKey={'app_deploy_messages.see_build_log'}>
              <a
                href={getAzureDevopsBuildResultUrl(deployHistoryEntry?.build.id)}
                target='_newTab'
                rel='noopener noreferrer'
              />
            </Trans>
          </div>
        </div>
      )}
    </>
  );
};
