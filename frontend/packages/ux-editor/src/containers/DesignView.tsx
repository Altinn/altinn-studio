import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Container } from './Container';
import type { IFormContainer, IFormLayoutOrder } from '../types/global';
import type { FormComponent as IFormComponent } from '../types/FormComponent';

import type { EditorDndEvents, EditorDndItem } from './helpers/dnd-types';
import { ItemType } from './helpers/dnd-types';
import {
  insertArrayElementAtPos,
  removeArrayElement,
  swapArrayElements,
} from 'app-shared/pure/array-functions';
import { useParams } from 'react-router-dom';
import { useUpdateFormComponentOrderMutation } from '../hooks/mutations/useUpdateFormComponentOrderMutation';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { FormContext } from './FormContext';

export interface DesignViewProps {
  isDragging: boolean;
  layoutOrder: IFormLayoutOrder;
}

export interface DesignViewState {
  layoutOrder: IFormLayoutOrder;
  isDragging: boolean;
}

export const DesignView = ({
  isDragging,
  layoutOrder,
}: DesignViewProps) => {
  const { formId, form, handleDiscard, handleEdit, handleContainerSave, handleComponentSave } = useContext(FormContext);
  const [beforeDrag, setBeforeDrag] = useState(null);

  const [state, setState] = useState<DesignViewState>({ layoutOrder, isDragging });
  useEffect(
    () => setState({ layoutOrder, isDragging }),
    [layoutOrder, isDragging]
  );

  const { org, app } = useParams();
  const updateFormComponentOrderMutation = useUpdateFormComponentOrderMutation(org, app);

  const setContainerLayoutOrder = (containerId: string, newLayoutOrder: string[]) => {
    if (newLayoutOrder.includes(containerId)) {
      throw Error("can't add item to itself");
    }
    setState({
      layoutOrder: { ...state.layoutOrder, [containerId]: newLayoutOrder },
      isDragging: true,
    });
  };

  const removeItemFromContainer = (item: EditorDndItem): void => {
    const updatedLayoutOrder = removeArrayElement(state.layoutOrder[item.containerId], item.id);
    setContainerLayoutOrder(item.containerId, updatedLayoutOrder);
    item.index = undefined;
    item.containerId = undefined;
  };

  const addItemToContainer = (
    item: EditorDndItem,
    targetContainerId: string,
    targetPos: number
  ) => {
    const newLayoutOrder = insertArrayElementAtPos(
      state.layoutOrder[targetContainerId],
      item.id,
      targetPos
    );
    setContainerLayoutOrder(targetContainerId, newLayoutOrder);
    item.index = newLayoutOrder.indexOf(item.id);
    item.containerId = targetContainerId;
  };

  const moveItemBetweenContainers = (
    item: EditorDndItem,
    targetContainerId: string,
    targetContainerPosition: number
  ) => {
    removeItemFromContainer(item);
    addItemToContainer(item, targetContainerId, targetContainerPosition);
  };

  const moveItemToTop = useCallback((item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[0]);
  }, []);

  const moveItemToBottom = useCallback((item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[arr.length - 1]);
  }, []);

  const swapItemsInsideTheSameContainer = (movedItem: EditorDndItem, targetId: string): void => {
    const currentLayoutOrder = state.layoutOrder[movedItem.containerId];
    const newLayoutOrder = swapArrayElements(currentLayoutOrder, movedItem.id, targetId);
    setContainerLayoutOrder(movedItem.containerId, newLayoutOrder);
    movedItem.index = newLayoutOrder.indexOf(movedItem.id);
  };

  const moveItem = useCallback((
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    toIndex?: number
  ): void => {
    if (
      !movedItem.id ||
      (ItemType.Item && !movedItem.containerId) ||
      (targetItem.type === ItemType.Container && movedItem.containerId === targetItem.id) ||
      (movedItem.id === targetItem.id)
    ) return;

    if (!beforeDrag) {
      setBeforeDrag(state.layoutOrder);
    }

    if (movedItem.containerId === targetItem.containerId) {
      swapItemsInsideTheSameContainer(movedItem, targetItem.id);
    } else if (targetItem.type === ItemType.Container && toIndex !== undefined) {
      moveItemBetweenContainers(movedItem, targetItem.id, toIndex);
    } else if (targetItem.type === ItemType.Item && movedItem.id !== targetItem.containerId) {
      moveItemBetweenContainers(movedItem, targetItem.containerId, targetItem.index);
    } else {
      // There is nothing that should be moved.
    }
  }, []);

  const resetState = () => {
    beforeDrag && setState({ layoutOrder: beforeDrag, isDragging: false });
  };
  const onDropItem = useCallback((reset?: boolean) => {
    if (reset) {
      resetState();
    } else {
      updateFormComponentOrderMutation.mutate(state.layoutOrder);
      setState({ ...state, isDragging: false });
    }
    setBeforeDrag(null);
  }, []);
  const baseContainerId =
    Object.keys(state.layoutOrder).length > 0 ? Object.keys(state.layoutOrder)[0] : null;

  const dndEvents: EditorDndEvents = useMemo(() => {
    return {
      moveItem,
      moveItemToBottom,
      moveItemToTop,
      onDropItem,
    }
  }, []);

  const { containers, components } = useFormLayoutsSelector(selectedLayoutSelector);

  const renderContainer = (
    id: string,
    parentContainerId: string,
    index: number,
    isBaseContainer: boolean,
    canDrag: boolean,
  ) => {
    if (!id) return null;

    const items = state.layoutOrder[id];

    return (
      <Container
          key={id}
          id={id}
          parentContainerId={parentContainerId}
          isBaseContainer={isBaseContainer}
          canDrag={canDrag}
          dndEvents={dndEvents}
          isEditMode={formId === id}
          container={formId === id ? form as IFormContainer : containers[id]}
          index={index}
          handleEdit={handleEdit}
          handleSave={handleContainerSave}
          handleDiscard={handleDiscard}
        >
          {
            items.map((itemId: string, itemIndex: number) => {
              const component = components[itemId];
              if (component) {
                return (
                  <FormComponent
                    key={itemId}
                    id={itemId}
                    containerId={id}
                    index={index}
                    dndEvents={dndEvents}
                    isEditMode={formId === itemId}
                    component={formId === itemId ? form as IFormComponent : components[itemId]}
                    handleEdit={handleEdit}
                    handleSave={handleComponentSave}
                    handleDiscard={handleDiscard}
                  />
                );
              }
              return containers[itemId] && renderContainer(itemId, id, itemIndex, false, true)
            })
          }
        </Container>
    )
  };

  return renderContainer(baseContainerId, null, 0, true, false);
};
