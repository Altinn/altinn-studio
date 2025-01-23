import type { ReactElement } from 'react';
import React, { useRef, useState } from 'react';
import { StudioButton, StudioModal, StudioTextfield, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './ConfirmUndeployDialog.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const ConfirmUndeployDialog = (): ReactElement => {
  const { t } = useTranslation();
  const { app: appName } = useStudioEnvironmentParams();
  const dialogRef = useRef<HTMLDialogElement>();
  const openDialog = () => dialogRef.current.showModal();
  const [isAppNameConfirmed, setIsAppNameConfirmed] = useState<boolean>(false);

  const onAppNameInputChange = (event: React.FormEvent<HTMLInputElement>): void => {
    setIsAppNameConfirmed(isAppNameConfirmedForDelete(event.currentTarget.value, appName));
  };

  return (
    <>
      <StudioButton size='sm' onClick={openDialog} variant='primary'>
        {t('app_deployment.undeploy_button')}
      </StudioButton>
      <StudioModal.Dialog
        closeButtonTitle={t('sync_header.close_local_changes_button')}
        heading='Avpubliser appen'
        ref={dialogRef}
      >
        <StudioParagraph spacing>
          {t('app_deployment.undeploy_confirmation_dialog_description')}
        </StudioParagraph>
        <StudioTextfield
          size='sm'
          label={t('app_deployment.undeploy_confirmation_input_label')}
          description={t('app_deployment.undeploy_confirmation_input_description', {
            appName,
          })}
          onChange={onAppNameInputChange}
        />
        <StudioButton
          disabled={!isAppNameConfirmed}
          color='danger'
          size='sm'
          className={classes.confirmUndeployButton}
        >
          {t('app_deployment.undeploy_confirmation_button')}
        </StudioButton>
      </StudioModal.Dialog>
    </>
  );
};

function isAppNameConfirmedForDelete(userInputAppName: string, appNameToMatch: string): boolean {
  return userInputAppName.toLowerCase().includes(appNameToMatch.toLowerCase());
}
