import React from 'react';
import classes from './AccessControlWarningModal.module.css';
import { Modal } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components-legacy/src';

export interface AccessControlWarningModalProps {
  modalRef: React.MutableRefObject<HTMLDialogElement>;
}

export const AccessControlWarningModal = ({ modalRef }: AccessControlWarningModalProps) => {
  const { t } = useTranslation();
  return (
    <Modal ref={modalRef}>
      <Modal.Content className={classes.modalContent}>
        {t('settings_modal.access_control_tab_option_choose_type_modal_message')}
      </Modal.Content>
      <Modal.Footer>
        <StudioButton variant='secondary' onClick={() => modalRef.current?.close()}>
          {t('general.close')}
        </StudioButton>
      </Modal.Footer>
    </Modal>
  );
};
