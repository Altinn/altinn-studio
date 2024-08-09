import React from 'react';
import { StudioButton, StudioModal, StudioParagraph } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './OverrideExistingImageModal.module.css';

interface OverrideExistingImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverrideExisting: () => void;
}

export const OverrideExistingImageModal = ({
  isOpen,
  onClose,
  onOverrideExisting,
}: OverrideExistingImageModalProps) => {
  const { t } = useTranslation();
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {t('ux_editor.properties_panel.images.override_existing_image_modal_title')}
        </Heading>
      }
      closeButtonLabel={t('general.close')}
    >
      <div className={classes.container}>
        <StudioParagraph size='small'>
          {t('ux_editor.properties_panel.images.override_existing_image_modal_content')}
        </StudioParagraph>
        <div className={classes.buttons}>
          <StudioButton color='danger' variant='secondary' onClick={onOverrideExisting}>
            {t('ux_editor.properties_panel.images.override_existing_image_button')}
          </StudioButton>
          <StudioButton variant='secondary' onClick={onClose}>
            {t('general.cancel')}
          </StudioButton>
        </div>
      </div>
    </StudioModal>
  );
};
