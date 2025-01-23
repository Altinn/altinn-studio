import React, { useRef } from 'react';
import { StudioButton, StudioModal } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { DialogContent } from './components/DialogContent';

export const UndeployConsequenceDialog = (): React.ReactElement => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>();
  const openDialog = () => dialogRef.current.showModal();

  return (
    <>
      <StudioButton size='sm' onClick={openDialog} variant='tertiary'>
        {t('app_deployment.undeploy_button')}
      </StudioButton>
      <StudioModal.Dialog
        closeButtonTitle={t('sync_header.close_local_changes_button')}
        heading={t('app_deployment.unpublish_consequence_dialog_title')}
        ref={dialogRef}
      >
        <DialogContent />
      </StudioModal.Dialog>
    </>
  );
};
