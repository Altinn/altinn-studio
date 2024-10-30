import React, { useCallback, useRef } from 'react';
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
import { StudioButton, StudioModal } from '@studio/components';
import type { AddedItem } from './types';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { AddItemContent } from './AddItemContent';
import { PlusCircleIcon } from '@studio/icons';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';

export type AddItemProps = {
  containerId: string;
  layout: IInternalLayout;
};

export const AddItemModal = ({ containerId, layout }: AddItemProps) => {
  const [selectedItem, setSelectedItem] = React.useState<AddedItem | null>(null);

  const { doReloadPreview } = usePreviewContext();
  const handleCloseModal = () => {
    setSelectedItem(null);
    modalRef.current?.close();
  };
  const { handleEdit } = useFormItemContext();

  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();

  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const modalRef = useRef<HTMLDialogElement>(null);

  const addItem = (type: ComponentType, parentId: string, index: number, newId: string) => {
    const updatedLayout = addItemOfType(layout, type, newId, parentId, index);

    addItemToLayout(
      { componentType: type, newId, parentId, index },
      {
        onSuccess: () => {
          doReloadPreview();
        },
      },
    );
    handleEdit(getItem(updatedLayout, newId));
  };

  const onAddComponent = (addedItem: AddedItem) => {
    addItem(
      addedItem.componentType,
      containerId,
      layout.order[containerId].length,
      addedItem.componentId,
    );
    handleCloseModal();
  };

  const handleOpenModal = useCallback(() => {
    modalRef.current?.showModal();
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginLeft: 12, marginRight: 12 }}>
      <StudioModal.Root>
        <StudioButton
          icon={<PlusCircleIcon />}
          onClick={handleOpenModal}
          variant='tertiary'
          fullWidth
        >
          Legg til komponent
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
            onAddItem={onAddComponent}
            onCancel={handleCloseModal}
            availableComponents={getAvailableChildComponentsForContainer(layout, BASE_CONTAINER_ID)}
          />
        </StudioModal.Dialog>
      </StudioModal.Root>
    </div>
  );
};
