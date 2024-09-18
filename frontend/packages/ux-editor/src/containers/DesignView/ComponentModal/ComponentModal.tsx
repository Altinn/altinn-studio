import React from 'react';
import { StudioHeading, StudioModal } from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../types/global';
import { AddItemContent } from '../AddItemModal/AddItemContent';

export type ComponentModalProps = {
  onAddComponent: (addedItem: AddedItemProps) => void;
  isOpen: boolean;
  onClose: () => void;
  availableComponents: KeyValuePairs<IToolbarElement[]>;
  generateComponentId: (type: ComponentType) => string;
};

export type AddedItemProps = {
  componentType: ComponentType;
  componentId: string;
};

export const ComponentModal = ({
  onAddComponent,
  isOpen,
  onClose,
  availableComponents,
}: ComponentModalProps) => {
  const [selectedItem, setSelectedItem] = React.useState<AddedItemProps | null>(null);

  const handleCloseModal = () => {
    setSelectedItem(null);
    onClose();
  };

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={<StudioHeading level={1}>Velg komponent</StudioHeading>}
      closeButtonLabel='Lukk'
    >
      <AddItemContent
        item={selectedItem}
        setItem={setSelectedItem}
        onAddItem={onAddComponent}
        availableComponents={availableComponents}
      />
    </StudioModal>
  );
};
