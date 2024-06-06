import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageConfigWarningModal.module.css';
import { Button, Modal } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
export interface PageConfigWarningModalProps {
  modalRef: React.MutableRefObject<HTMLDialogElement>;
}
export const PageConfigWarningModal = ({ modalRef }: PageConfigWarningModalProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <Modal ref={modalRef}>
      <Modal.Content className={classes.modalContent}>
        <p>Du har samme id på flere komponenter</p>
      </Modal.Content>
      <Modal.Footer>
        <Button variant='secondary' onClick={() => modalRef.current?.close()}>
          <p>Endre ID-ene manuelt</p>
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
