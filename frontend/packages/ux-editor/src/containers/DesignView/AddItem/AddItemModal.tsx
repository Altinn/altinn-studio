import React, { useCallback, useRef } from 'react';
import { getAvailableChildComponentsForContainer } from '../../../utils/formLayoutUtils';
import type { IInternalLayout, IToolbarElement } from '../../../types/global';
import { StudioButton, StudioModal } from '@studio/components';
import type { AddedItem } from './types';
import { AddItemContent } from './AddItemContent';
import { PlusIcon } from '@studio/icons';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import classes from './AddItemModal.module.css';

export type AddItemModalProps = {
  containerId: string;
  layout: IInternalLayout;
  onAddComponent?: (addedItem: AddedItem) => void;
  availableComponents?: KeyValuePairs<IToolbarElement[]>;
};

export const AddItemModal = ({ containerId, layout, onAddComponent }: AddItemModalProps) => {
  const [selectedItem, setSelectedItem] = React.useState<AddedItem | null>(null);
  const handleCloseModal = () => {
    setSelectedItem(null);
    modalRef.current?.close();
  };

  const modalRef = useRef<HTMLDialogElement>(null);

  const handleAddComponent = (addedItem: AddedItem) => {
    onAddComponent(addedItem);
    handleCloseModal();
  };

  const handleOpenModal = useCallback(() => {
    modalRef.current?.showModal();
  }, []);

  const availableComponents = getAvailableChildComponentsForContainer(layout, containerId);

  return (
    <StudioModal.Root>
      <StudioButton
        onClick={handleOpenModal}
        variant='primary'
        className={classes.componentButtonInline}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <PlusIcon fontSize='1.5rem' />
          Vis alle
        </div>
      </StudioButton>
      <StudioModal.Dialog
        onClose={handleCloseModal}
        heading={'Velg komponent'}
        closeButtonTitle='Lukk'
        style={{ minWidth: '80vw', overflowY: 'hidden' }}
        ref={modalRef}
      >
        <AddItemContent
          item={selectedItem}
          setItem={setSelectedItem}
          onAddItem={handleAddComponent}
          onCancel={handleCloseModal}
          availableComponents={availableComponents}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
};
