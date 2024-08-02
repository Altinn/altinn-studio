import type { ReactNode } from 'react';
import React from 'react';
import { StudioModal } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LocalChanges } from './LocalChanges/LocalChanges';
import { MonitorIcon } from '@studio/icons';

export type LocalChangesModalProps = {
  triggerClassName?: string;
};

export const LocalChangesModal = ({ triggerClassName }: LocalChangesModalProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={triggerClassName} icon={<MonitorIcon />} variant='tertiary'>
        {t('sync_header.local_changes')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        heading={t('sync_header.local_changes')}
        closeButtonTitle={t('sync_header.close_local_changes_button')}
      >
        <LocalChanges />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
};
