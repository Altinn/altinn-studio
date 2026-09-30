import type { ReactElement } from 'react';
import { useId, useState } from 'react';
import classes from './DeployDialog.module.css';
import {
  StudioButton,
  StudioDialog,
  StudioHeading,
  StudioParagraph,
  StudioRadio,
  StudioRadioGroup,
  StudioSpinner,
} from '@studio/components';
import { useTranslation } from 'react-i18next';
import { usePostHog } from '@posthog/react';
import type { DeployAppStatus } from 'app-shared/types/AppStatus';

export const DEPLOY_EVENT_NAME = 'user_confirmed_app_deploy';

const appStatusTextKeys: Record<DeployAppStatus, string> = {
  UnderDevelopment: 'app_deployment.app_status_under_development',
  Completed: 'app_deployment.app_status_completed',
};

export type DeployDialogProps = {
  appDeployedVersion: string;
  selectedImageTag: string;
  disabled: boolean;
  isPending: boolean;
  isProduction: boolean;
  onConfirm: (appStatus: DeployAppStatus) => void;
};

export const DeployDialog = ({
  appDeployedVersion,
  selectedImageTag,
  disabled,
  isPending,
  isProduction,
  onConfirm,
}: DeployDialogProps): ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHog();
  const radioGroupName = useId();

  const defaultAppStatus = getDefaultAppStatus(isProduction);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [appStatus, setAppStatus] = useState<DeployAppStatus>(defaultAppStatus);

  const openDialog = (): void => {
    setAppStatus(defaultAppStatus);
    setIsOpen(true);
  };

  const closeDialog = (): void => setIsOpen(false);

  const handleDeployConfirm = (): void => {
    onConfirm(appStatus);
    posthog.capture(DEPLOY_EVENT_NAME);
    closeDialog();
  };

  return (
    <>
      <StudioButton disabled={!selectedImageTag || disabled} onClick={openDialog}>
        {isPending && <DeploySpinner />}
        {t('app_deployment.btn_deploy_new_version')}
      </StudioButton>
      <StudioDialog open={isOpen} onClose={closeDialog} className={classes.dialog}>
        <StudioDialog.Block>
          <StudioHeading level={2}>{t('app_deployment.deploy_dialog_heading')}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.content}>
          <StudioParagraph>
            {appDeployedVersion
              ? t('app_deployment.deploy_confirmation', {
                  selectedImageTag,
                  appDeployedVersion,
                })
              : t('app_deployment.deploy_confirmation_short', { selectedImageTag })}
          </StudioParagraph>
          <StudioRadioGroup
            legend={t('app_deployment.app_status_legend')}
            description={t('app_deployment.app_status_description')}
          >
            {deployAppStatuses.map((status) => (
              <StudioRadio
                key={status}
                name={radioGroupName}
                value={status}
                label={t(appStatusTextKeys[status])}
                checked={appStatus === status}
                onChange={() => setAppStatus(status)}
              />
            ))}
          </StudioRadioGroup>
          <div className={classes.buttonContainer}>
            <StudioButton variant='primary' onClick={handleDeployConfirm}>
              {t('app_deployment.deploy_dialog_confirm')}
            </StudioButton>
            <StudioButton variant='tertiary' onClick={closeDialog}>
              {t('general.cancel')}
            </StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
};

const deployAppStatuses: DeployAppStatus[] = ['UnderDevelopment', 'Completed'];

const getDefaultAppStatus = (isProduction: boolean): DeployAppStatus =>
  isProduction ? 'Completed' : 'UnderDevelopment';

const DeploySpinner = (): ReactElement => {
  const { t } = useTranslation();
  return <StudioSpinner spinnerTitle={t('app_deployment.deploy_loading')} aria-hidden />;
};
