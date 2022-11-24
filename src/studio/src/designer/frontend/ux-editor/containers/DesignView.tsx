import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container } from './Container';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder } from '../types/global';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';

import type { EditorDndEvents, EditorDndItem } from './helpers/dnd-types';
import { ItemType } from './helpers/dnd-types';
import {
  insertArrayElementAtPos,
  removeArrayElement,
  swapArrayElements,
} from 'app-shared/pure/array-functions';

export interface IDesignerPreviewState {
  layoutOrder: IFormLayoutOrder;
  order: IFormLayoutOrder;
  activeList: any[];
  isDragging: boolean;
}

export const DesignView = (initialState: IDesignerPreviewState) => {
  const [beforeDrag, setBeforeDrag] = useState(null);
  const [state, setState] = useState<IDesignerPreviewState>({
    layoutOrder: {},
    order: {},
    activeList: [],
    isDragging: false,
  });
  useEffect(() => setState(initialState), [initialState]);

  const setContainerLayoutOrder = (containerId: string, layoutOrder: string[]) => {
    if (layoutOrder.includes(containerId)) {
      throw Error("can't add item to itself");
    }
    setState((prevState: IDesignerPreviewState) => {
      return {
        ...prevState,
        layoutOrder: {
          ...prevState.layoutOrder,
          [containerId]: layoutOrder,
        },
        isDragging: true,
      };
    });
  };

  const removeItemFromContainer = (item: EditorDndItem): void => {
    const layoutOrder = removeArrayElement(state.layoutOrder[item.containerId], item.id);
    setContainerLayoutOrder(item.containerId, layoutOrder);
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

  const moveItemToTop = (item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[0]);
  };

  const moveItemToBottom = (item: EditorDndItem) => {
    const arr = state.layoutOrder[item.containerId];
    swapItemsInsideTheSameContainer(item, arr[arr.length - 1]);
  };

  const swapItemsInsideTheSameContainer = (movedItem: EditorDndItem, targetId: string): void => {
    const currentLayoutOrder = state.layoutOrder[movedItem.containerId];
    const newLayoutOrder = swapArrayElements(currentLayoutOrder, movedItem.id, targetId);
    setContainerLayoutOrder(movedItem.containerId, newLayoutOrder);
    movedItem.index = newLayoutOrder.indexOf(movedItem.id);
  };

  const moveItem = (
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    toIndex?: number
  ): void => {
    if (!movedItem.id) {
      return;
    }
    if (ItemType.Item && !movedItem.containerId) {
      return;
    }
    if (targetItem.type === ItemType.Container && movedItem.containerId === targetItem.id) {
      return;
    }
    if (movedItem.id === targetItem.id) {
      return;
    }
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
  };

  const resetState = () => {
    if (beforeDrag) {
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: beforeDrag,
          isDragging: false,
        };
      });
    }
  };
  const dispatch = useDispatch();
  const onDropItem = (reset?: boolean) => {
    if (reset) {
      resetState();
    } else {
      dispatch(
        FormLayoutActions.updateFormComponentOrder({
          updatedOrder: state.layoutOrder,
        })
      );
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          isDragging: false,
        };
      });
      dispatch(
        FormLayoutActions.updateActiveListOrder({
          containerList: state.activeList,
          orderList: state.order as any,
        })
      );
    }
    setBeforeDrag(null);
  };
  const baseContainerId =
    Object.keys(state.layoutOrder).length > 0 ? Object.keys(state.layoutOrder)[0] : null;
  const dndEvents: EditorDndEvents = {
    moveItem,
    moveItemToBottom,
    moveItemToTop,
    onDropItem,
  };
  return (
    baseContainerId && (
      <DroppableDraggableContainer
        id={baseContainerId}
        isBaseContainer={true}
        canDrag={false}
        dndEvents={dndEvents}
      >
        <Container
          isBaseContainer={true}
          id={baseContainerId}
          items={state.layoutOrder[baseContainerId]}
          layoutOrder={state.layoutOrder}
          dndEvents={dndEvents}
        />
      </DroppableDraggableContainer>
    )
  );
};
