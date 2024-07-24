import React from 'react';
import classes from './SessionExpiredModal.module.css';
import { StudioButton, StudioModal } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { Heading, Paragraph } from '@digdir/designsystemet-react';

export type SessionExpiredModalProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
};

export const SessionExpiredModal = ({
  open,
  onClose,
  onContinue,
}: SessionExpiredModalProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioModal
      isOpen={open}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {t('session.expires')}
        </Heading>
      }
      closeButtonLabel={t('general.close')}
    >
      <div className={classes.modalContent}>
        <Paragraph size='small' spacing>
          {t('session.inactive')}
        </Paragraph>
        <div className={classes.buttonWrapper}>
          <StudioButton color='first' onClick={onContinue}>
            {t('general.continue')}
          </StudioButton>
          <StudioButton color='inverted' onClick={onClose}>
            {t('general.sign_out')}
          </StudioButton>
        </div>
      </div>
    </StudioModal>
  );
};
