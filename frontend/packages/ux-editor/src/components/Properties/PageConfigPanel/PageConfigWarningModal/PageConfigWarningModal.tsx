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
    <Modal ref={modalRef} role='dialog'>
      <Modal.Header closeButton={false}>
        {t('ux_editor.modal_properties_warning_modal_title')}
      </Modal.Header>
      <Modal.Content>
        {t('ux_editor.modal_properties_warning_modal_sub_title')}
        <div className={classes.instructiveTitle}>
          {t('ux_editor.modal_properties_warning_modal_instructive_text_title')}
        </div>
        {t('ux_editor.modal_properties_warning_modal_instructive_text_body')}
      </Modal.Content>
      <Modal.Footer>
        <Button variant='primary' onClick={() => modalRef.current?.close()}>
          {t('ux_editor.modal_properties_warning_modal_close_button')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
