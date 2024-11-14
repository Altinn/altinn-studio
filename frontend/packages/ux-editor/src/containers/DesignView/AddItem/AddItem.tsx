import React from 'react';
import {
  addItemOfType,
  getDefaultChildComponentsForContainer,
  getItem,
} from '../../../utils/formLayoutUtils';
import { useAddItemToLayoutMutation } from '../../../hooks/mutations/useAddItemToLayoutMutation';
import { useFormItemContext } from '../../FormItemContext';
import { useAppContext } from '../../../hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IInternalLayout } from '../../../types/global';
import type { ComponentType, CustomComponentType } from 'app-shared/types/ComponentType';
import { StudioButton } from '@studio/components';
import type { AddedItem } from './types';
import { PlusIcon } from '@studio/icons';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { DefaultItems } from './DefaultItems';
import { AddItemModal } from './AddItemModal';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import classes from './AddItem.module.css';

export type AddItemProps = {
  containerId: string;
  layout: IInternalLayout;
};

export const AddItem = ({ containerId, layout }: AddItemProps) => {
  const [selectedItem, setSelectedItem] = React.useState<AddedItem | null>(null);
  const [showDefaultComponents, setShowDefaultComponents] = React.useState(false);

  const { doReloadPreview } = usePreviewContext();
  const { handleEdit } = useFormItemContext();

  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();

  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const addItem = (
    type: ComponentType | CustomComponentType,
    parentId: string,
    index: number,
    newId: string,
  ) => {
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
  };

  const handleShowDefaultComponents = () => {
    setShowDefaultComponents(true);
  };

  const handleHideDefaultComponents = () => {
    setShowDefaultComponents(false);
  };

  const defaultComponents = getDefaultChildComponentsForContainer(layout, containerId);
  const shouldShowAllComponentsButton = defaultComponents.length > 8;

  console.log('Show default components', showDefaultComponents);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: containerId === BASE_CONTAINER_ID ? 'center' : 'flex-start',
        marginLeft: 12,
        marginRight: 12,
      }}
    >
      {!showDefaultComponents && (
        <StudioButton
          icon={<PlusIcon />}
          onClick={handleShowDefaultComponents}
          variant='tertiary'
          fullWidth={containerId === BASE_CONTAINER_ID}
        >
          Legg til komponent
        </StudioButton>
      )}
      {showDefaultComponents && (
        <div className={classes.addItemButtons}>
          <DefaultItems
            item={selectedItem}
            setItem={setSelectedItem}
            onAddItem={onAddComponent}
            onCancel={handleHideDefaultComponents}
            availableComponents={defaultComponents}
            showAllButton={
              shouldShowAllComponentsButton && (
                <AddItemModal
                  containerId={containerId}
                  layout={layout}
                  onAddComponent={onAddComponent}
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
};
