import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container } from './Container';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder } from '../types/global';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import {
  ContainerPos,
  EditorDndEvents,
  EditorDndItem,
  insertArrayElementAtPos,
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
    targetPos: number,
  ) => {
    const newLayoutOrder = insertArrayElementAtPos(
      state.layoutOrder[targetContainerId],
      item.id,
      targetPos,
    );
    setContainerLayoutOrder(targetContainerId, newLayoutOrder);
    item.index = newLayoutOrder.indexOf(item.id);
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
    containerPos?: ContainerPos,
  ): void => {
    if (!movedItem.id) {
      return; // No id, no drag
    }
    if (ItemType.ITEM && !movedItem.containerId) {
      return; // don't know where to put the item, ignore
    }
    if (
      targetItem.type === ItemType.CONTAINER &&
      movedItem.containerId === targetItem.id
    ) {
      return; // Need to check if item already is in the targeted container.
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
    } else if (targetItem.type === ItemType.CONTAINER && containerPos) {
      const targetContainerPos = containerPos === ContainerPos.TOP ? 0 : 99;
      moveItemBetweenContainers(movedItem, targetItem.id, targetContainerPos);
    } else if (
      targetItem.type === ItemType.ITEM &&
      movedItem.id !== targetItem.containerId
    ) {
      // We are moving the item to the new container at the position of the target item.
      moveItemBetweenContainers(
        movedItem,
        targetItem.containerId,
        targetItem.index,
      );
    } else {
      console.log('Nothing to do');
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
    // Resetting the before drag status
    setBeforeDrag(null);
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
