import type { ReactElement } from 'react';
import React, { useRef, useState } from 'react';
import {
  StudioButton,
  StudioModal,
  StudioTextfield,
  StudioAlert,
  StudioLink,
} from '@studio/components-legacy';
import { StudioParagraph } from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import classes from './ConfirmUndeployDialog.module.css';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUndeployMutation } from '../../../../hooks/mutations/useUndeployMutation';

type ConfirmUndeployDialogProps = {
  environment: string;
};
export const ConfirmUndeployDialog = ({
  environment,
}: ConfirmUndeployDialogProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app: appName } = useStudioEnvironmentParams();
  const dialogRef = useRef<HTMLDialogElement>();
  const [isAppNameConfirmed, setIsAppNameConfirmed] = useState<boolean>(false);
  const {
    mutate: mutateUndeploy,
    isPending: isPendingUndeploy,
    error: undeployError,
  } = useUndeployMutation(org, appName);
  const onAppNameInputChange = (event: React.FormEvent<HTMLInputElement>): void => {
    setIsAppNameConfirmed(isAppNameConfirmedForDelete(event.currentTarget.value, appName));
  };

  const openDialog = () => dialogRef.current.showModal();
  const closeDialog = () => dialogRef.current.close();

  const onUndeployClicked = (): void => {
    mutateUndeploy(
      {
        environment,
      },
      {
        onSuccess: (): void => {
          closeDialog();
        },
      },
    );
  };

  return (
    <>
      <StudioButton size='sm' onClick={openDialog} variant='primary'>
        {t('app_deployment.undeploy_button')}
      </StudioButton>
      <StudioModal.Dialog
        closeButtonTitle={t('sync_header.close_local_changes_button')}
        heading={t('app_deployment.undeploy_confirmation_dialog_title')}
        ref={dialogRef}
      >
        <StudioParagraph className={classes.description}>
          {t('app_deployment.undeploy_confirmation_dialog_description')}
        </StudioParagraph>
        <StudioTextfield
          label={t('app_deployment.undeploy_confirmation_input_label')}
          description={t('app_deployment.undeploy_confirmation_input_description', {
            appName,
          })}
          onChange={onAppNameInputChange}
        />
        {undeployError && (
          <StudioAlert severity='danger' className={classes.errorContainer}>
            <StudioParagraph>
              <Trans
                i18nKey={'app_deployment.error_unknown.message'}
                components={{
                  a: <StudioLink href='/info/contact'> </StudioLink>,
                }}
              />
            </StudioParagraph>
          </StudioAlert>
        )}
        <StudioButton
          disabled={!isAppNameConfirmed || isPendingUndeploy}
          color='danger'
          size='sm'
          className={classes.confirmUndeployButton}
          onClick={onUndeployClicked}
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
