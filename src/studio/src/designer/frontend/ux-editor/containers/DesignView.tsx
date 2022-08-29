import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container } from './Container';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder } from '../types/global';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import {
  EditorDndEvents,
  EditorDndItem,
  ItemType,
  removeArrayElement,
  swapArrayElements,
} from './helpers/dnd-helpers';

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
  const dispatch = useDispatch();

  const setContainerLayoutOrder = (
    containerId: string,
    layoutOrder: string[],
  ) => {
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
    const layoutOrder = removeArrayElement(
      state.layoutOrder[item.containerId],
      item.id,
    );
    setContainerLayoutOrder(item.containerId, layoutOrder);
    item.index = undefined;
    item.containerId = undefined;
  };
  const addItemToContainer = (
    item: EditorDndItem,
    targetContainerId: string,
    targetPosition: number,
  ) => {
    const layoutOrder = [...state.layoutOrder[targetContainerId]];
    layoutOrder.splice(targetPosition, 0, item.id);
    setContainerLayoutOrder(targetContainerId, layoutOrder);
    item.index = targetPosition;
    item.containerId = targetContainerId;
  };
  const moveItemBetweenContainers = (
    item: EditorDndItem,
    targetContainerId: string,
    targetContainerPosition: number,
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

  /**
   * Swaps item inside a container and returns the new index to update the item.
   * @param movedId
   * @param targetId
   * @param containerId
   */
  const swapItemsInsideTheSameContainer = (
    movedItem: EditorDndItem,
    targetId: string,
  ): void => {
    const currentLayoutOrder = state.layoutOrder[movedItem.containerId];
    const newLayoutOrder = swapArrayElements(
      currentLayoutOrder,
      movedItem.id,
      targetId,
    );
    setContainerLayoutOrder(movedItem.containerId, newLayoutOrder);
    movedItem.index = newLayoutOrder.indexOf(movedItem.id);
  };

  const moveItem = (
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    movingDown?: boolean,
  ): void => {
    const targetContainerId =
      targetItem.type === ItemType.CONTAINER
        ? targetItem.id
        : targetItem.containerId;

    if (!movedItem.id) {
      return; // No id, no drag
    }
    if (!targetContainerId) {
      return; // don't know where to put the container, ignore
    }
    if (movedItem.id === targetItem.id) {
      return; // we are hovering our selves... no need to do anything.
    }
    if (!beforeDrag) {
      setBeforeDrag(state.layoutOrder); // store the before drag state.
    }

    // they are in the same container easy swap this is regardless about their type
    if (movedItem.containerId === targetItem.containerId) {
      swapItemsInsideTheSameContainer(movedItem, targetItem.id);
    } else if (targetItem.type === ItemType.CONTAINER) {
      // For now, put the item at the top
      moveItemBetweenContainers(movedItem, targetContainerId, 0);
    } else {
      // We are moving the item to the new container at the position of the target item.
      moveItemBetweenContainers(movedItem, targetContainerId, targetItem.index);
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
      setBeforeDrag(null);
    }
  };
  /**
   * Comitting the drop state
   *
   * @param reset
   */
  const onDropItem = (reset?: boolean) => {
    if (reset) {
      resetState();
    } else {
      dispatch(
        FormLayoutActions.updateFormComponentOrder({
          updatedOrder: state.layoutOrder,
        }),
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
        }),
      );
    }
  };
  const baseContainerId =
    Object.keys(state.layoutOrder).length > 0
      ? Object.keys(state.layoutOrder)[0]
      : null;
  const dndEvents: EditorDndEvents = {
    onDropItem,
    moveItem,
    moveItemToTop,
    moveItemToBottom,
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
          key={baseContainerId}
          layoutOrder={state.layoutOrder}
          dndEvents={dndEvents}
        />
      </DroppableDraggableContainer>
    )
  );
};
