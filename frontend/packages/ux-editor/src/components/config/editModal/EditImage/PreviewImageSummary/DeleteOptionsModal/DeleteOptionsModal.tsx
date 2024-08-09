import React from 'react';
import { StudioDeleteButton, StudioModal, StudioParagraph } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './DeleteOptionsModal.module.css';

export interface DeleteOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteImage: () => void;
  onDeleteImageReferenceOnly: () => void;
}

export const DeleteOptionsModal = ({
  isOpen,
  onClose,
  onDeleteImage,
  onDeleteImageReferenceOnly,
}: DeleteOptionsModalProps) => {
  const { t } = useTranslation();
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {t('ux_editor.properties_panel.images.delete_image_options_modal_title')}
        </Heading>
      }
      closeButtonLabel={t('general.close')}
    >
      <div className={classes.container}>
        <div>
          <StudioParagraph size='small'>
            {t('ux_editor.properties_panel.images.delete_image_options_modal_content_only_ref')}
          </StudioParagraph>
          <StudioParagraph size='small'>
            {t(
              'ux_editor.properties_panel.images.delete_image_options_modal_content_ref_and_from_library',
            )}
          </StudioParagraph>
        </div>
        <div className={classes.buttons}>
          <StudioDeleteButton onDelete={onDeleteImageReferenceOnly}>
            {t('ux_editor.properties_panel.images.delete_image_options_modal_button_only_ref')}
          </StudioDeleteButton>
          <StudioDeleteButton onDelete={onDeleteImage} variant='primary'>
            {t(
              'ux_editor.properties_panel.images.delete_image_options_modal_button_ref_and_from_library',
            )}
          </StudioDeleteButton>
        </div>
      </div>
    </StudioModal>
  );
};
