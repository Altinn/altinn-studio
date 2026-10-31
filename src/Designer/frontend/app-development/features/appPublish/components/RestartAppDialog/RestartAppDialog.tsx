import { useRef, type ReactElement } from 'react';
import { StudioButton, StudioDialog, StudioHeading, StudioParagraph } from '@studio/components';
import { ArrowsCirclepathIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import { useRestartAppMutation } from '../../../../hooks/mutations/useRestartAppMutation';
import classes from './RestartAppDialog.module.css';

export type RestartAppDialogProps = {
  runningApp: RunningApp;
  envTitle: string;
};

export const RestartAppDialog = ({ runningApp, envTitle }: RestartAppDialogProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { mutate: restartApp, isPending } = useRestartAppMutation(org, app);

  const openDialog = () => dialogRef.current?.showModal();
  const closeDialog = () => dialogRef.current?.close();

  // A failure shows as a toast, so the dialog closes either way.
  const onRestartClicked = () =>
    restartApp({ environment: runningApp.environment }, { onSettled: closeDialog });

  return (
    <>
      <StudioButton
        onClick={openDialog}
        variant='tertiary'
        icon={<ArrowsCirclepathIcon />}
        disabled={runningApp.status === 'updating'}
      >
        {t('app_deployment.restart_button')}
      </StudioButton>
      <StudioDialog ref={dialogRef}>
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
            <StudioButton variant='secondary' onClick={closeDialog}>
              {t('general.cancel')}
            </StudioButton>
          </div>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
};
