import React from 'react';
import { StudioModal } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import { ChooseFromLibrary } from './ChooseFromLibrary';
import { useTranslation } from 'react-i18next';

export interface AddImageFromLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddImageFromLibraryModal = ({ isOpen, onClose }: AddImageFromLibraryModalProps) => {
  const { t } = useTranslation();
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {t('ux_editor.properties_panel.images.choose_from_library_modal_title')}
        </Heading>
      }
      closeButtonLabel={t('general.close')}
    >
      <ChooseFromLibrary />
    </StudioModal>
  );
};
