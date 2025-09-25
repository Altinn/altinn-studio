import React, { useRef } from 'react';
import { StudioModal } from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
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
      <StudioModal.Dialog
        closeButtonTitle={t('sync_header.close_local_changes_button')}
        heading={t('app_deployment.unpublish_consequence_dialog_title')}
        ref={dialogRef}
      >
        <DialogContent environment={environment} />
      </StudioModal.Dialog>
    </>
  );
};
