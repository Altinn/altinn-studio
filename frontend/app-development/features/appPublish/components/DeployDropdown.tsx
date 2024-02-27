import React, { useState } from 'react';
import classes from './DeployDropdown.module.css';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton } from '@studio/components';
import { Combobox, Spinner } from '@digdir/design-system-react';
import type { ImageOption } from './ImageOption';
import { useTranslation } from 'react-i18next';

export interface DeployDropdownProps {
  appDeployedVersion: string;
  envName: string;
  imageOptions: ImageOption[];
  disabled: boolean;
  setSelectedImageTag: (tag) => void;
  selectedImageTag: string;
  startDeploy: any;
  isPending: boolean;
  inProgress: boolean;
}

export const DeployDropdown = ({
  appDeployedVersion,
  imageOptions,
  envName,
  selectedImageTag,
  setSelectedImageTag,
  disabled,
  startDeploy,
  isPending,
  inProgress,
}: DeployDropdownProps) => {
  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();
  const { t } = useTranslation();
  const onStartDeployClick = async () => {
    await startDeploy();
  };
  return (
    <div className={classes.deployDropDown}>
      <div id={`deploy-select-${envName.toLowerCase()}`}>
        {imageOptions.length > 0 && (
          <Combobox
            size='small'
            value={selectedImageTag ? [selectedImageTag] : undefined}
            label={t('app_deployment.messages.choose_version')}
            onValueChange={(selectedImageOptions: string[]) =>
              setSelectedImageTag(selectedImageOptions[0])
            }
            disabled={inProgress}
          >
            {imageOptions.map((imageOption) => {
              return (
                <Combobox.Option key={imageOption.value} value={imageOption.value}>
                  {imageOption.label}
                </Combobox.Option>
              );
            })}
          </Combobox>
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
            <StudioButton
              disabled={disabled}
              onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
              id={`deploy-button-${envName.toLowerCase()}`}
              size='small'
            >
              {isPending && (
                <Spinner
                  variant='interaction'
                  title={t('app_deployment.pipeline_deployment.build_result.none')}
                  size='xsmall'
                />
              )}
              {t('app_deployment.messages.btn_deploy_new_version')}
            </StudioButton>
          }
        >
          <p>
            {appDeployedVersion
              ? t('app_deployment.messages.deploy_confirmation', {
                  selectedImageTag,
                  appDeployedVersion,
                })
              : t('app_deployment.messages.deploy_confirmation_short', { selectedImageTag })}
          </p>
        </AltinnConfirmDialog>
      </div>
    </div>
  );
};
