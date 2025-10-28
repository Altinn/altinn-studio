import React, { forwardRef } from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
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
      <StudioDialog ref={dialogRef}>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            {t('ux_editor.properties_panel.images.delete_image_options_modal_title')}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block>
          <DeleteOptions
            onDeleteImageReferenceOnly={onDeleteImageReferenceOnly}
            onDeleteImage={onDeleteImage}
          />
        </StudioDialog.Block>
      </StudioDialog>
    );
  },
);

DeleteOptionsModal.displayName = 'DeleteOptionsModal';
