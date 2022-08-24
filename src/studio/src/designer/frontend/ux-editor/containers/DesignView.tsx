import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Container } from './Container';
import DroppableDraggableContainer from './DroppableDraggableContainer';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder } from '../types/global';

export interface IDesignerPreviewState {
  layoutOrder: IFormLayoutOrder;
  order: IFormLayoutOrder;
  activeList: any[];
  isDragging: boolean;
}

export const DesignView = (initialState: IDesignerPreviewState) => {
  const [state, setState] = useState<IDesignerPreviewState>({
    layoutOrder: {},
    order: {},
    activeList: [],
    isDragging: false,
  });
  useEffect(() => setState(initialState), [initialState]);

  const dispatch = useDispatch();

  const moveComponent = (
    id: string,
    index: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ): void => {
    if (!id) {
      return; // dragging a toolbaritem - they don't have ids
    }

    if (sourceContainerId === destinationContainerId) {
      const updatedOrder: string[] = state.layoutOrder[sourceContainerId];
      if (updatedOrder.indexOf(id) === index) {
        return;
      }
      const [moveItem] = updatedOrder.splice(updatedOrder.indexOf(id), 1);
      updatedOrder.splice(index, 0, moveItem);
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [sourceContainerId]: [...updatedOrder],
          },
          isDragging: true,
        };
      });
    } else {
      // Moving to different container
      // If element is still inside old container => remove from old and place in the new conatiner
      const updatedOrderSource: string[] = state.layoutOrder[sourceContainerId];
      const updatedOrderDestination: string[] =
        state.layoutOrder[destinationContainerId];

      if (updatedOrderSource.indexOf(id) > -1) {
        // Remove component from source, place in dest layoutOrder
        const [moveItem] = updatedOrderSource.splice(
          updatedOrderSource.indexOf(id),
          1,
        );
        updatedOrderDestination.splice(index, 0, moveItem);
        setState((prevState: IDesignerPreviewState) => {
          return {
            ...prevState,
            layoutOrder: {
              ...prevState.layoutOrder,
              [destinationContainerId]: [...updatedOrderDestination],
              [sourceContainerId]: [...updatedOrderSource],
            },
            isDragging: true,
          };
        });
      } else {
        // The component has been dragged to an unknown container, locate the container and remove
        const container = Object.keys(state.layoutOrder).find(
          (containerId: string) => state.layoutOrder[containerId].includes(id),
        );
        const [movedComponent] = state.layoutOrder[container].splice(
          state.layoutOrder[container].indexOf(id),
          1,
        );
        if (!movedComponent) {
          return;
        }
        updatedOrderDestination.splice(index, 0, movedComponent);
        setState((prevState: IDesignerPreviewState) => {
          return {
            ...prevState,
            layoutOrder: {
              ...prevState.layoutOrder,
              [destinationContainerId]: [...updatedOrderDestination],
              [container]: [...state.layoutOrder[container]],
            },
            isDragging: true,
          };
        });
      }
    }
  };

  const getStatefullIndexOfContainer = (
    containerId: string,
    parentContainerId: string = Object.keys(state.layoutOrder)[0],
  ): number => {
    if (containerId === parentContainerId) {
      return 0;
    }
    return state.layoutOrder[parentContainerId]?.indexOf(containerId);
  };

  const moveContainer = (
    id: string,
    index: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ): void => {
    if (!id) {
      return; // No id, no drag
    }

    if (!destinationContainerId) {
      return; // dont know where to put the container, ignore
    }

    if (sourceContainerId === destinationContainerId) {
      const updatedOrder: string[] = state.layoutOrder[sourceContainerId];
      if (updatedOrder.indexOf(id) < 0) {
        return;
      }
      const [movedContainer] = updatedOrder.splice(updatedOrder.indexOf(id), 1);
      updatedOrder.splice(index, 0, movedContainer);
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [sourceContainerId]: [...updatedOrder],
          },
          isDragging: true,
        };
      });
    } else {
      const updatedSource: string[] = state.layoutOrder[sourceContainerId];
      const updatedDestination: string[] =
        state.layoutOrder[destinationContainerId];
      if (updatedDestination?.indexOf('placeholder') > -1) {
        // remove the placeholder in the destination (if there is one)
        updatedDestination.splice(updatedDestination.indexOf('placeholder'), 1);
      }
      const [movedContainer] = updatedSource.splice(
        state.layoutOrder[sourceContainerId].indexOf(id),
        1,
      );
      updatedDestination?.splice(index, 0, movedContainer);
      setState((prevState: IDesignerPreviewState) => {
        return {
          ...prevState,
          layoutOrder: {
            ...prevState.layoutOrder,
            [destinationContainerId]: [...updatedDestination],
          },
          isDragging: true,
        };
      });
    }
  };

  const dropContainer = () => {
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
  };

  const dropComponent = () => {
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
  };
  const baseContainerId =
    Object.keys(state.layoutOrder).length > 0
      ? Object.keys(state.layoutOrder)[0]
      : null;

  return (
    baseContainerId && (
      <DroppableDraggableContainer
        id={baseContainerId}
        baseContainer={true}
        canDrag={false}
        onDropComponent={dropComponent}
        onMoveComponent={moveComponent}
        onDropContainer={dropContainer}
        onMoveContainer={moveContainer}
        getIndex={getStatefullIndexOfContainer}
      >
        <Container
          baseContainer={true}
          id={baseContainerId}
          items={state.layoutOrder[baseContainerId]}
          key={baseContainerId}
          layoutOrder={state.layoutOrder}
          onDropComponent={dropComponent}
          onMoveComponent={moveComponent}
          onDropContainer={dropContainer}
          onMoveContainer={moveContainer}
        />
      </DroppableDraggableContainer>
    )
  );
};
