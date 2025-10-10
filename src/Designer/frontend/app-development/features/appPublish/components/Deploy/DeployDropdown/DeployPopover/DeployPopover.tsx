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
    <StudioPopover.TriggerContext>
      <StudioPopover.Trigger
        disabled={!selectedImageTag || disabled}
        onClick={() => setIsConfirmDeployDialogOpen((prevState) => !prevState)}
      >
        {isPending && <PopoverSpinner />}
        {t('app_deployment.btn_deploy_new_version')}
      </StudioPopover.Trigger>
      <StudioPopover
        className={classes.popover}
        placement='right'
        open={isConfirmDeployDialogOpen}
        onClose={() => setIsConfirmDeployDialogOpen(false)}
        data-color='warning'
        variant='tinted'
      >
        {isConfirmDeployDialogOpen && (
          <>
            <StudioParagraph spacing>
              {appDeployedVersion
                ? t('app_deployment.deploy_confirmation', {
                    selectedImageTag,
                    appDeployedVersion,
                  })
                : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
            </StudioParagraph>
            <div className={classes.buttonContainer}>
              <StudioButton
                data-color='first'
                variant='primary'
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  onConfirm();
                  setIsConfirmDeployDialogOpen(false);
                }}
              >
                {t('general.yes')}
              </StudioButton>
              <StudioButton
                data-color='second'
                variant='tertiary'
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  setIsConfirmDeployDialogOpen(false);
                }}
              >
                {t('general.cancel')}
              </StudioButton>
            </div>
          </>
        )}
      </StudioPopover>
    </StudioPopover.TriggerContext>
  );
};

const PopoverSpinner = () => {
  const { t } = useTranslation();
  return <StudioSpinner spinnerTitle={t('app_deployment.deploy_loading')} aria-hidden />;
};
