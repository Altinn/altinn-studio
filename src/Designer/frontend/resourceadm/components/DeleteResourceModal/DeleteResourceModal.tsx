import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioDialog, StudioParagraph } from '@studio/components';
import { ResourceAdmDialogContent } from '../ResourceAdmDialogContent/ResourceAdmDialogContent';

interface DeleteResourceModalProps {
  onCloseModal: () => void;
  onClickDeleteResource: () => void;
}

export const DeleteResourceModal = forwardRef<HTMLDialogElement, DeleteResourceModalProps>(
  ({ onCloseModal, onClickDeleteResource }, ref): React.JSX.Element => {
    const { t } = useTranslation();

    return (
      <StudioDialog ref={ref} onClose={onCloseModal}>
        <ResourceAdmDialogContent
          heading={t('resourceadm.dashboard_delete_resource_header')}
          footer={
            <>
              <StudioButton variant='primary' data-color='danger' onClick={onClickDeleteResource}>
                {t('resourceadm.dashboard_delete_resource_confirm')}
              </StudioButton>
              <StudioButton variant='tertiary' onClick={onCloseModal}>
                {t('general.cancel')}
              </StudioButton>
            </>
          }
        >
          <StudioParagraph data-size='md'>
            {t('resourceadm.dashboard_delete_resource_body')}
          </StudioParagraph>
        </ResourceAdmDialogContent>
      </StudioDialog>
    );
  },
);

DeleteResourceModal.displayName = 'DeleteResourceModal';
