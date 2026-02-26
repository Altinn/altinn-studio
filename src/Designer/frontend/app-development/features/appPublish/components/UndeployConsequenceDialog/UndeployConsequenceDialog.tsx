import React, { useRef } from 'react';
import { StudioButton, StudioDialog, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { DialogContent } from './components/DialogContent';

type UndeployConsequenceDialog = {
  environment: string;
};
export const UndeployConsequenceDialog = ({
  environment,
}: UndeployConsequenceDialog): React.ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openDialog = () => dialogRef.current.showModal();

  return (
    <>
      <StudioButton onClick={openDialog} variant='tertiary'>
        {t('app_deployment.undeploy_button')}
      </StudioButton>
      <StudioDialog ref={dialogRef}>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            {t('app_deployment.unpublish_consequence_dialog_title')}
          </StudioHeading>
        </StudioDialog.Block>
        <DialogContent environment={environment} />
      </StudioDialog>
    </>
  );
};
