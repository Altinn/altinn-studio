import React, { useState } from 'react';
import classes from './DeployDropdown.module.css';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton } from '@studio/components';
import { Combobox } from '@digdir/design-system-react';
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
            label={t('app_deploy_messages.choose_version')}
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
              {t('app_deploy_messages.btn_deploy_new_version')}
            </StudioButton>
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
    </div>
  );
};
