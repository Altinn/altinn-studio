import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import { StudioButton, StudioModal } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { LocalChanges } from './LocalChanges/LocalChanges';
import { MonitorIcon } from '@studio/icons';

export type LocalChangesModalProps = {
  triggerClassName?: string;
};

export const LocalChangesModal = ({ triggerClassName }: LocalChangesModalProps): ReactNode => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>();
  const openDialog = () => dialogRef.current?.showModal();

  return (
    <>
      <StudioButton
        className={triggerClassName}
        icon={<MonitorIcon />}
        onClick={openDialog}
        variant='tertiary'
      >
        {t('sync_header.local_changes')}
      </StudioButton>
      <StudioModal.Dialog
        closeButtonTitle={t('sync_header.close_local_changes_button')}
        heading={t('sync_header.local_changes')}
        ref={dialogRef}
      >
        <LocalChanges />
      </StudioModal.Dialog>
    </>
  );
};
