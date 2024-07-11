import type { ReactNode } from 'react';
import React from 'react';
import classes from './LocalChangesModal.module.css';
import { Heading } from '@digdir/designsystemet-react';
import { MonitorIcon } from '@studio/icons';
import { StudioModal } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { LocalChanges } from './LocalChanges/LocalChanges';

export type LocalChangesModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const LocalChangesModal = ({ isOpen, onClose }: LocalChangesModalProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className={classes.headingWrapper}>
          <MonitorIcon className={classes.icon} />
          <Heading level={1} size='small'>
            {t('sync_header.local_changes')}
          </Heading>
        </div>
      }
      closeButtonLabel={t('sync_header.close_local_changes_button')}
    >
      <LocalChanges />
    </StudioModal>
  );
};
