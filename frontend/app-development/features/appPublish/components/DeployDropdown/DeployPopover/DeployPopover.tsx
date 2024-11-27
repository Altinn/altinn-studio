import React, { type ReactElement, useState } from 'react';
import classes from './DeployPopover.module.css';
import { StudioButton, StudioParagraph, StudioPopover, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type DeployPopoverProps = {
  appDeployedVersion: string;
  selectedImageTag: string;
  disabled: boolean;
  isPending: boolean;
  onConfirm: () => void;
};

export const DeployPopover = ({
  appDeployedVersion,
  selectedImageTag,
  disabled,
  isPending,
  onConfirm,
}: DeployPopoverProps): ReactElement => {
  const { t } = useTranslation();

  const [isConfirmDeployDialogOpen, setIsConfirmDeployDialogOpen] = useState<boolean>();

  return (
    <StudioPopover variant='warning' placement='right' open={isConfirmDeployDialogOpen}>
      <StudioPopover.Trigger
        disabled={!selectedImageTag || disabled}
        onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
        size='sm'
      >
        {isPending && (
          <StudioSpinner
            variant='interaction'
            size='xsmall'
            data-testid='spinner-test-id'
            spinnerTitle=''
          />
        )}
        {t('app_deployment.btn_deploy_new_version')}
      </StudioPopover.Trigger>
      <StudioPopover.Content className={classes.popover}>
        <StudioParagraph size='sm' spacing>
          {appDeployedVersion
            ? t('app_deployment.deploy_confirmation', {
                selectedImageTag,
                appDeployedVersion,
              })
            : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
        </StudioParagraph>
        <div className={classes.buttonContainer}>
          <StudioButton
            color='first'
            variant='primary'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              onConfirm();
              setIsConfirmDeployDialogOpen(false);
            }}
            size='sm'
          >
            {t('general.yes')}
          </StudioButton>
          <StudioButton
            color='second'
            variant='tertiary'
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation();
              setIsConfirmDeployDialogOpen(false);
            }}
            size='sm'
          >
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioPopover.Content>
    </StudioPopover>
  );
};
