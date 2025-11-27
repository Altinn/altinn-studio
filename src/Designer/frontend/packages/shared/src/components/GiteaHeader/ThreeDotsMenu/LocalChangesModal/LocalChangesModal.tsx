import type { ReactNode } from 'react';
import React, { useRef } from 'react';
import { StudioButton, StudioDialog, StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LocalChanges } from './LocalChanges/LocalChanges';
import { MonitorIcon } from '@studio/icons';
import classes from './LocalChangesModal.module.css';

export const LocalChangesModal = (): ReactNode => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>();
  const openDialog = () => dialogRef.current?.showModal();

  return (
    <>
      <StudioButton icon={<MonitorIcon />} onClick={openDialog} variant='tertiary' data-size='sm'>
        {t('sync_header.local_changes')}
      </StudioButton>
      <StudioDialog ref={dialogRef} closedby='any' className={classes.dialog}>
        <StudioDialog.Block className={classes.headerBlock}>
          <StudioHeading level={2}>{t('sync_header.local_changes')}</StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <LocalChanges />
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
};
