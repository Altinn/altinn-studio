import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FormContainer } from './FormContainer';
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
  const { mutate: updateFormComponentOrder } = useUpdateFormComponentOrderMutation(org, app);

  const handleUpdateFormComponentOrder = useCallback(
    updateFormComponentOrder,
    [updateFormComponentOrder]
  );

  const setContainerLayoutOrder = useCallback((containerId: string, newLayoutOrder: string[]) => {
    if (newLayoutOrder.includes(containerId)) {
      throw Error("can't add item to itself");
    }
    setState({
      layoutOrder: { ...state.layoutOrder, [containerId]: newLayoutOrder },
      isDragging: true,
    });
  }, [state.layoutOrder]);

  const removeItemFromContainer = useCallback((item: EditorDndItem): void => {
    const updatedLayoutOrder = removeArrayElement(state.layoutOrder[item.containerId], item.id);
    setContainerLayoutOrder(item.containerId, updatedLayoutOrder);
    item.index = undefined;
    item.containerId = undefined;
  }, [setContainerLayoutOrder, state.layoutOrder]);

  const addItemToContainer = useCallback((
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
  }, [setContainerLayoutOrder, state.layoutOrder]);

  const moveItemBetweenContainers = useCallback((
    item: EditorDndItem,
    targetContainerId: string,
    targetContainerPosition: number
  ) => {
    removeItemFromContainer(item);
    addItemToContainer(item, targetContainerId, targetContainerPosition);
  }, [addItemToContainer, removeItemFromContainer]);

  const swapItemsInsideTheSameContainer = useCallback((movedItem: EditorDndItem, targetId: string): void => {
    const currentLayoutOrder = state.layoutOrder[movedItem.containerId];
    const newLayoutOrder = swapArrayElements(currentLayoutOrder, movedItem.id, targetId);
    setContainerLayoutOrder(movedItem.containerId, newLayoutOrder);
    movedItem.index = newLayoutOrder.indexOf(movedItem.id);
  }, [setContainerLayoutOrder, state.layoutOrder]);

  const moveItemToTop = useCallback((item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[0]);
  }, [state.layoutOrder, swapItemsInsideTheSameContainer]);

  const moveItemToBottom = useCallback((item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[arr.length - 1]);
  }, [state.layoutOrder, swapItemsInsideTheSameContainer]);

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
  }, [beforeDrag, moveItemBetweenContainers, state.layoutOrder, swapItemsInsideTheSameContainer]);

  const resetState = useCallback(() => {
    beforeDrag && setState({ layoutOrder: beforeDrag, isDragging: false });
  }, [beforeDrag]);
  const onDropItem = useCallback((reset?: boolean) => {
    if (reset) {
      resetState();
    } else {
      handleUpdateFormComponentOrder(state.layoutOrder);
      setState({ ...state, isDragging: false });
    }
    setBeforeDrag(null);
  }, [resetState, state, handleUpdateFormComponentOrder]);
  const baseContainerId =
    Object.keys(state.layoutOrder).length > 0 ? Object.keys(state.layoutOrder)[0] : null;

  const dndEvents: EditorDndEvents = useMemo(() => {
    return {
      moveItem,
      moveItemToBottom,
      moveItemToTop,
      onDropItem,
    }
  }, [moveItem, moveItemToBottom, moveItemToTop, onDropItem]);

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
      <FormContainer
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
                    index={itemIndex}
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
        </FormContainer>
    )
  };

  return renderContainer(baseContainerId, null, 0, true, false);
};
