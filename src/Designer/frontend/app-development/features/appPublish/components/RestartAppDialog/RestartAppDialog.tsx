import type { ReactElement } from 'react';
import { StudioButton, StudioDialog, StudioHeading, StudioParagraph } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import { useRestartAppMutation } from '../../../../hooks/mutations/useRestartAppMutation';
import classes from './RestartAppDialog.module.css';

export type RestartAppDialogProps = {
  runningApp: RunningApp;
  envTitle: string;
  isOpen: boolean;
  onClose: () => void;
};

export const RestartAppDialog = ({
  runningApp,
  envTitle,
  isOpen,
  onClose,
}: RestartAppDialogProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: restartApp, isPending } = useRestartAppMutation(org, app);

  // A failure shows as a toast, so the dialog closes either way.
  const onRestartClicked = () =>
    restartApp({ environment: runningApp.environment }, { onSettled: onClose });

  return (
    <StudioDialog open={isOpen} onClose={onClose}>
      <StudioDialog.Block>
        <StudioHeading level={2}>
          {t('app_deployment.restart_confirmation_dialog_title', { envTitle })}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <StudioParagraph spacing>
          {t('app_deployment.restart_confirmation_dialog_description', {
            version: runningApp.version,
          })}
        </StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton onClick={onRestartClicked} disabled={isPending}>
            {t('app_deployment.restart_confirmation_button')}
          </StudioButton>
          <StudioButton variant='secondary' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </StudioDialog.Block>
    </StudioDialog>
  );
};
