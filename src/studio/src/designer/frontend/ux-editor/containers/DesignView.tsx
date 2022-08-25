import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container } from './Container';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder } from '../types/global';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import {
  EditorDndEvents,
  EditorDraggableItem,
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
  /**
  const dragDropManager = useDragDropManager();
  useEffect(() => {
    window.ondrag = () => {
      console.log();
    };
dragDropManager.getMonitor()
      .subscribeToStateChange(() => {
        console.log(allTargetIds);
        console.log(
          'changeds',
          dragDropManager.getMonitor().canDropOnTarget(undefined),
        );
      });
  }, []);
  */

  const [state, setState] = useState<IDesignerPreviewState>({
    layoutOrder: {},
    order: {},
    activeList: [],
    isDragging: false,
  });

  useEffect(() => setState(initialState), [initialState]);

  const dispatch = useDispatch();

  const onMoveComponent = (
    movedItem: EditorDraggableItem,
    targetItem: EditorDraggableItem,
  ): void => {
    if (!movedItem.id) {
      return; // dragging a toolbaritem - they don't have ids
    }
    if (!beforeDrag) {
      setBeforeDrag(state.layoutOrder); // store the before drag state.
    }
    if (movedItem.containerId === targetItem.containerId) {
      const { containerId } = movedItem;
      const currentLayoutOrder = state.layoutOrder[containerId];
      const newLayoutOrder = swapArrayElements(
        currentLayoutOrder,
        movedItem.id,
        targetItem.id,
      );
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [containerId]: newLayoutOrder,
          },
          isDragging: true,
        };
      });
    } else {
      // Moving to different container
      // If element is still inside old container => remove from old and place in the new conatiner
      const updatedOrderSource: string[] =
        state.layoutOrder[movedItem.containerId];
      const updatedOrderDestination: string[] =
        state.layoutOrder[targetItem.containerId];

      if (updatedOrderSource.indexOf(movedItem.id) > -1) {
        // Remove component from source, place in dest layoutOrder
        const [moveItem] = updatedOrderSource.splice(
          updatedOrderSource.indexOf(movedItem.id),
          1,
        );
        updatedOrderDestination.splice(movedItem.index, 0, moveItem);
        setState((prevState: IDesignerPreviewState) => {
          return {
            ...prevState,
            layoutOrder: {
              ...prevState.layoutOrder,
              [targetItem.containerId]: [...updatedOrderDestination],
              [movedItem.containerId]: [...updatedOrderSource],
            },
            isDragging: true,
          };
        });
      } else {
        // The component has been dragged to an unknown container, locate the container and remove
        const container = Object.keys(state.layoutOrder).find(
          (containerId: string) =>
            state.layoutOrder[containerId].includes(movedItem.id),
        );
        const [movedComponent] = state.layoutOrder[container].splice(
          state.layoutOrder[container].indexOf(movedItem.id),
          1,
        );
        if (!movedComponent) {
          return;
        }
        updatedOrderDestination.splice(movedItem.index, 0, movedComponent);
        setState((prevState: IDesignerPreviewState) => {
          return {
            ...prevState,
            layoutOrder: {
              ...prevState.layoutOrder,
              [targetItem.containerId]: [...updatedOrderDestination],
              [container]: [...state.layoutOrder[container]],
            },
            isDragging: true,
          };
        });
      }
    }
  };

  const onMoveContainer = (
    movedItem: EditorDraggableItem,
    targetItem: EditorDraggableItem,
  ): void => {
    if (!movedItem.id) {
      return; // No id, no drag
    }
    if (!targetItem.containerId) {
      return; // don't know where to put the container, ignore
    }
    if (!beforeDrag) {
      setBeforeDrag(state.layoutOrder); // store the before drag state.
    }
    if (movedItem.containerId === targetItem.containerId) {
      // we just have one containerId
      const { containerId } = movedItem;
      const updatedOrder: string[] = state.layoutOrder[containerId];
      if (updatedOrder.indexOf(movedItem.id) < 0) {
        return;
      }
      const [movedContainer] = updatedOrder.splice(
        updatedOrder.indexOf(movedItem.id),
        1,
      );

      // Going to take over target position
      updatedOrder.splice(targetItem.index, 0, movedContainer);
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [containerId]: [...updatedOrder],
          },
          isDragging: true,
        };
      });
    } else {
      const updatedSource: string[] = state.layoutOrder[movedItem.containerId];
      const updatedDestination: string[] =
        state.layoutOrder[targetItem.containerId] ?? [];
      if (updatedDestination?.indexOf('placeholder') > -1) {
        // remove the placeholder in the destination (if there is one)
        updatedDestination.splice(updatedDestination.indexOf('placeholder'), 1);
      }
      const [movedContainer] = updatedSource.splice(
        state.layoutOrder[movedItem.containerId].indexOf(movedItem.id),
        1,
      );
      updatedDestination.splice(targetItem.index, 0, movedContainer);
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [targetItem.containerId]: [...updatedDestination],
          },
          isDragging: true,
        };
      });
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
  const onDropContainer = (reset?: boolean) => {
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

  const onDropComponent = (reset?: boolean) => {
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
    onDropComponent,
    onDropContainer,
    onMoveComponent,
    onMoveContainer,
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
