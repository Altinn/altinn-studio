import React from 'react';
import {
  addItemOfType,
  getItem,
  mapComponentToToolbarElement,
} from '../../../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../../../hooks/mutations/useAddItemToLayoutMutation';
import { generateComponentId } from '../../../utils/generateId';
import { useFormItemContext } from '../../FormItemContext';
import { useAppContext, useFormLayouts } from '../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { type IInternalLayout, type IToolbarElement } from '../../../types/global';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { StudioButton } from '@studio/components';
import type { AddedItemProps } from '../ComponentModal/ComponentModal';
import { ComponentModal } from '../ComponentModal/ComponentModal';
import { allComponents } from '../../../data/formItemConfig';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

export type AddItemProps = {
  containerId: string;
  layout: IInternalLayout;
};

const getAvailableChildComponentsForContainer = (
  layout: IInternalLayout,
  containerId: string,
): KeyValuePairs<IToolbarElement[]> => {
  if (containerId !== BASE_CONTAINER_ID) return {};
  const allComponentLists: KeyValuePairs<IToolbarElement[]> = {};
  Object.keys(allComponents).forEach((key) => {
    allComponentLists[key] = allComponents[key].map(mapComponentToToolbarElement);
  });
  return allComponentLists;
};

export const AddItem = ({ containerId, layout }: AddItemProps) => {
  const [isComponentModalOpen, setIsComponentModalOpen] = React.useState(false);
  const { handleEdit } = useFormItemContext();
  const layouts = useFormLayouts();

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
      <ComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        onAddComponent={onAddComponent}
        availableComponents={getAvailableChildComponentsForContainer(layout, containerId)}
        generateComponentId={(type: ComponentType) => generateComponentId(type, layouts)}
      />
    </>
  );
};
