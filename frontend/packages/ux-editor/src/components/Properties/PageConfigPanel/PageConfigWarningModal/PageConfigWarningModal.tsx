import type { ReactNode } from 'react';
import React from 'react';
import classes from './PageConfigWarningModal.module.css';
import { Modal } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export interface PageConfigWarningModalProps {
  modalRef: React.MutableRefObject<HTMLDialogElement>;
}
export const PageConfigWarningModal = ({ modalRef }: PageConfigWarningModalProps): ReactNode => {
  const { t } = useTranslation();
  return (
    <Modal ref={modalRef} role='dialog'>
      <Modal.Header closeButton={true}>
        {t('ux_editor.modal_properties_warning_modal_title')}
      </Modal.Header>
      <Modal.Content>
        <div className={classes.subTitle}>
          {t('ux_editor.modal_properties_warning_modal_sub_title')}
        </div>
        {t('ux_editor.modal_properties_warning_modal_instructive_text_body')}
      </Modal.Content>
      <Modal.Footer />
    </Modal>
  );
};
