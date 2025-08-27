import React, { forwardRef } from 'react';
import { StudioModal } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { useForwardedRef } from '@studio/hooks';
import { DeleteOptions } from './DeleteOptions';

export interface DeleteOptionsModalProps {
  onDeleteImage: () => void;
  onDeleteImageReferenceOnly: () => void;
}

export const DeleteOptionsModal = forwardRef<HTMLDialogElement, DeleteOptionsModalProps>(
  ({ onDeleteImage, onDeleteImageReferenceOnly }, ref): JSX.Element => {
    const { t } = useTranslation();
    const dialogRef = useForwardedRef<HTMLDialogElement>(ref);

    return (
      <StudioModal.Dialog
        heading={t('ux_editor.properties_panel.images.delete_image_options_modal_title')}
        closeButtonTitle={t('general.close')}
        ref={dialogRef}
      >
        <DeleteOptions
          onDeleteImageReferenceOnly={onDeleteImageReferenceOnly}
          onDeleteImage={onDeleteImage}
        />
      </StudioModal.Dialog>
    );
  },
);

DeleteOptionsModal.displayName = 'DeleteOptionsModal';
