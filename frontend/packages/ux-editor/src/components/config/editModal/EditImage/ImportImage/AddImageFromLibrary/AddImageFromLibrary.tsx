import React from 'react';
import { StudioModal } from '@studio/components';
import { Heading } from '@digdir/designsystemet-react';
import { ChooseFromLibraryModal } from './ChooseFromLibraryModal';

export interface AddImageFromLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddImageFromLibrary = ({ isOpen, onClose }: AddImageFromLibraryProps) => {
  return (
    <StudioModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Heading level={1} size='small'>
          {'Velg bilde fra applikasjonens bildebibliotk'}
        </Heading>
      }
      closeButtonLabel={'Lukk'}
    >
      <ChooseFromLibraryModal />
    </StudioModal>
  );
};
