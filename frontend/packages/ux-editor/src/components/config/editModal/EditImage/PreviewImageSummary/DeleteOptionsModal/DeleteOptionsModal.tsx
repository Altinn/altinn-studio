import React from 'react';
import { StudioDeleteButton, StudioModal, StudioParagraph } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

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
      <div>
        <StudioParagraph>
          {
            'Sletter du kun bildereferansen vil bildet fortsatt eksistere i biblioteket. Sletter du bildet vil både bildereferanse og bildet i biblioteket sletts'
          }
        </StudioParagraph>
        <div>
          <StudioDeleteButton onDelete={onDeleteImageReferenceOnly}>
            {'Slett kun bildereferanse'}
          </StudioDeleteButton>
          <StudioDeleteButton onDelete={onDeleteImage}>{'Slett bilde'}</StudioDeleteButton>
        </div>
      </div>
    </StudioModal>
  );
};
