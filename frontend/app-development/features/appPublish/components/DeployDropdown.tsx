import React, { useState } from 'react';
import classes from './DeployDropdown.module.css';
import { AltinnConfirmDialog } from 'app-shared/components';
import { StudioButton } from '@studio/components';
import { Combobox, Spinner } from '@digdir/design-system-react';
import type { ImageOption } from './ImageOption';
import { useTranslation } from 'react-i18next';

export interface DeployDropdownProps {
  appDeployedVersion: string;
  imageOptions: ImageOption[];
  disabled: boolean;
  setSelectedImageTag: (tag: string) => void;
  selectedImageTag: string;
  startDeploy: () => void;
  isPending: boolean;
}

export const DeployDropdown = ({
  appDeployedVersion,
  imageOptions,
  selectedImageTag,
  setSelectedImageTag,
  disabled,
  startDeploy,
  isPending,
}: DeployDropdownProps) => {
  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();
  const { t } = useTranslation();
  return (
    <div className={classes.deployDropDown}>
      <div>
        {imageOptions.length > 0 && (
          <Combobox
            size='small'
            value={selectedImageTag ? [selectedImageTag] : undefined}
            label={t('app_deployment.choose_version')}
            onValueChange={(selectedImageOptions: string[]) =>
              setSelectedImageTag(selectedImageOptions[0])
            }
            disabled={disabled}
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
          onConfirm={startDeploy}
          onClose={() => setIsConfirmDeployDialogOpen(false)}
          placement='right'
          trigger={
            <StudioButton
              disabled={!selectedImageTag || disabled}
              onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
              size='small'
            >
              {isPending && (
                <Spinner
                  variant='interaction'
                  title=''
                  size='xsmall'
                  data-testid='spinner-test-id'
                />
              )}
              {t('app_deployment.btn_deploy_new_version')}
            </StudioButton>
          }
        >
          <p>
            {appDeployedVersion
              ? t('app_deployment.deploy_confirmation', {
                  selectedImageTag,
                  appDeployedVersion,
                })
              : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
          </p>
        </AltinnConfirmDialog>
      </div>
    </div>
  );
};
