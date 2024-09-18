import React from 'react';
import {
  addItemOfType,
  getAvailableChildComponentsForContainer,
  getItem,
} from '../../../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../../../hooks/mutations/useAddItemToLayoutMutation';
import { useFormItemContext } from '../../FormItemContext';
import { useAppContext } from '../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IInternalLayout } from '../../../types/global';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioButton, StudioHeading, StudioModal } from '@studio/components';
import type { AddedItemProps } from '../ComponentModal/ComponentModal';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { AddItemContent } from './AddItemContent';

export type AddItemProps = {
  containerId: string;
  layout: IInternalLayout;
};

export const AddItemModal = ({ containerId, layout }: AddItemProps) => {
  const [isComponentModalOpen, setIsComponentModalOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<AddedItemProps | null>(null);

  const handleCloseModal = () => {
    setSelectedItem(null);
    setIsComponentModalOpen(false);
  };
  const { handleEdit } = useFormItemContext();

  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName, refetchLayouts } = useAppContext();

  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const addItem = (type: ComponentType, parentId: string, index: number, newId: string) => {
    const updatedLayout = addItemOfType(layout, type, newId, parentId, index);

    addItemToLayout(
      { componentType: type, newId, parentId, index },
      {
        onSuccess: async () => {
          await refetchLayouts(selectedFormLayoutSetName);
        },
      },
    );
    handleEdit(getItem(updatedLayout, newId));
  };

  const onAddComponent = (addedItem: AddedItemProps) => {
    addItem(
      addedItem.componentType,
      containerId,
      layout.order[containerId].length,
      addedItem.componentId,
    );
    setIsComponentModalOpen(false);
  };

  return (
    <>
      <StudioButton variant='secondary' fullWidth onClick={() => setIsComponentModalOpen(true)}>
        Add component!
      </StudioButton>
      <StudioModal
        isOpen={isComponentModalOpen}
        onClose={handleCloseModal}
        title={<StudioHeading level={1}>Velg komponent</StudioHeading>}
        closeButtonLabel='Lukk'
      >
        <AddItemContent
          item={selectedItem}
          setItem={setSelectedItem}
          onAddItem={onAddComponent}
          availableComponents={getAvailableChildComponentsForContainer(layout, BASE_CONTAINER_ID)}
        />
      </StudioModal>
    </>
  );
};
