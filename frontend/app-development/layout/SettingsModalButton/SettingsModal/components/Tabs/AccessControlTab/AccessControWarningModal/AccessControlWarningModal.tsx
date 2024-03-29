import React from 'react';
import classes from './AccessControlWarningModal.module.css';
import { Modal, Button } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';

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
        <Button variant='secondary' onClick={() => modalRef.current?.close()}>
          {t('general.close')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
