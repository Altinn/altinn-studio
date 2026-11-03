import { useId, type ReactElement } from 'react';
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
  const headingId = useId();

  // A failure shows as a toast, so the dialog closes either way.
  const onRestartClicked = () =>
    restartApp({ environment: runningApp.environment }, { onSettled: onClose });

  return (
    // The dialog sits in the environment's status alert, whose color it would otherwise take, such as red when failed.
    <StudioDialog open={isOpen} onClose={onClose} aria-labelledby={headingId} data-color='accent'>
      <StudioDialog.Block>
        <StudioHeading level={2} id={headingId}>
          {t('app_deployment.restart_confirmation_dialog_title', { envTitle })}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>
        <StudioParagraph spacing>
          {runningApp.version
            ? t('app_deployment.restart_confirmation_dialog_description', {
                version: runningApp.version,
              })
            : t('app_deployment.restart_confirmation_dialog_description_without_version')}
        </StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton
            onClick={onRestartClicked}
            disabled={isPending || runningApp.status === 'updating'}
          >
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
