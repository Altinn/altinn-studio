import React from 'react';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { Container } from './Container';
import DroppableDraggableContainer from './DroppableDraggableContainer';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { IFormLayoutOrder, IAppState } from '../types/global';

interface IDesignerPreviewProvidedProps {
  dispatch?: Dispatch;
}

interface IDesignerPreviewProps extends IDesignerPreviewProvidedProps {
  layoutOrder: IFormLayoutOrder;
  order: IFormLayoutOrder;
  activeList: any[];
}

interface IDesignerPreviewState {
  layoutOrder: IFormLayoutOrder;
  order: IFormLayoutOrder;
  activeList: any[];
  isDragging: boolean;
}

class DesignView extends React.Component<
  IDesignerPreviewProps,
  IDesignerPreviewState
> {
  public static getDerivedStateFromProps(
    nextProps: IDesignerPreviewProps,
    prevState: IDesignerPreviewState,
  ) {
    if (prevState.isDragging) {
      return {
        ...prevState,
      };
    }
    return {
      ...nextProps,
    };
  }

  constructor(_props: IDesignerPreviewProps) {
    super(_props);

    this.state = {
      layoutOrder: _props.layoutOrder,
      isDragging: false,
      order: _props.order,
      activeList: _props.activeList,
    };
  }

  public moveComponent = (
    id: string,
    index: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ): void => {
    if (!id) {
      // dragging a toolbaritem - they don't have ids
      return;
    }

    if (sourceContainerId === destinationContainerId) {
      const { layoutOrder } = this.state;
      const updatedOrder: string[] = layoutOrder[sourceContainerId];
      if (updatedOrder.indexOf(id) === index) {
        return;
      }
      const [moveItem] = updatedOrder.splice(updatedOrder.indexOf(id), 1);
      updatedOrder.splice(index, 0, moveItem);
      this.setState((prevState: IDesignerPreviewState) => {
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
      const { layoutOrder } = this.state;
      const updatedOrderSource: string[] = layoutOrder[sourceContainerId];
      const updatedOrderDestination: string[] =
        layoutOrder[destinationContainerId];
      if (updatedOrderSource.indexOf(id) > -1) {
        // Remove component from source, place in dest layoutOrder
        const [moveItem] = updatedOrderSource.splice(
          updatedOrderSource.indexOf(id),
          1,
        );
        updatedOrderDestination.splice(index, 0, moveItem);
        this.setState((prevState: IDesignerPreviewState) => {
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
        const container = Object.keys(layoutOrder).find(
          (containerId: string) => {
            return layoutOrder[containerId].includes(id);
          },
        );
        const [movedComponent] = layoutOrder[container].splice(
          layoutOrder[container].indexOf(id),
          1,
        );
        if (!movedComponent) {
          return;
        }
        updatedOrderDestination.splice(index, 0, movedComponent);
        this.setState((prevState: IDesignerPreviewState) => {
          return {
            ...prevState,
            layoutOrder: {
              ...prevState.layoutOrder,
              [destinationContainerId]: [...updatedOrderDestination],
              [container]: [...layoutOrder[container]],
            },
            isDragging: true,
          };
        });
      }
    }
  };

  public getStatefullIndexOfContainer = (
    containerId: string,
    parentContainerId: string = Object.keys(this.props.layoutOrder)[0],
  ): number => {
    if (containerId === parentContainerId) {
      return 0;
    }
    return this.state.layoutOrder[parentContainerId]?.indexOf(containerId);
  };

  public moveContainer = (
    id: string,
    index: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ) => {
    if (!id) {
      // No id, no drag
      return;
    }

    if (!destinationContainerId) {
      // dont know where to put the container, ignore
      return;
    }

    if (sourceContainerId === destinationContainerId) {
      const { layoutOrder } = this.state;
      const updatedOrder: string[] = layoutOrder[sourceContainerId];
      if (updatedOrder.indexOf(id) < 0) {
        return;
      }
      const [movedContainer] = updatedOrder.splice(updatedOrder.indexOf(id), 1);
      updatedOrder.splice(index, 0, movedContainer);
      this.setState((prevState: IDesignerPreviewState) => {
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
      const { layoutOrder } = this.state;
      const updatedSource: string[] = layoutOrder[sourceContainerId];
      const updatedDestination: string[] = layoutOrder[destinationContainerId];
      if (updatedDestination?.indexOf('placeholder') > -1) {
        // remove the placeholder in the destination (if there is one)
        updatedDestination.splice(updatedDestination.indexOf('placeholder'), 1);
      }
      const [movedContainer] = updatedSource.splice(
        layoutOrder[sourceContainerId].indexOf(id),
        1,
      );
      updatedDestination?.splice(index, 0, movedContainer);
      this.setState((prevState: IDesignerPreviewState) => {
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

  public dropContainer = () => {
    const { dispatch } = this.props;
    dispatch(
      FormLayoutActions.updateFormComponentOrder({
        updatedOrder: this.state.layoutOrder,
      }),
    );
    this.setState((prevState: IDesignerPreviewState) => {
      return {
        ...prevState,
        isDragging: false,
      };
    });
    dispatch(
      FormLayoutActions.updateActiveListOrder({
        containerList: this.props.activeList,
        orderList: this.props.order as any,
      }),
    );
  };

  public dropComponent = () => {
    const { dispatch } = this.props;
    dispatch(
      FormLayoutActions.updateFormComponentOrder({
        updatedOrder: this.state.layoutOrder,
      }),
    );
    this.setState((prevState: IDesignerPreviewState) => {
      return {
        ...prevState,
        isDragging: false,
      };
    });
    dispatch(
      FormLayoutActions.updateActiveListOrder({
        containerList: this.props.activeList,
        orderList: this.props.order as any,
      }),
    );
  };

  public render(): JSX.Element {
    const baseContainerId =
      Object.keys(this.state.layoutOrder).length > 0
        ? Object.keys(this.state.layoutOrder)[0]
        : null;
    if (!baseContainerId) {
      return null;
    }
    return (
      <DroppableDraggableContainer
        id={baseContainerId}
        baseContainer={true}
        canDrag={false}
        onDropComponent={this.dropComponent}
        onMoveComponent={this.moveComponent}
        onDropContainer={this.dropContainer}
        onMoveContainer={this.moveContainer}
        getIndex={this.getStatefullIndexOfContainer}
      >
        <Container
          baseContainer={true}
          id={baseContainerId}
          items={this.state.layoutOrder[baseContainerId]}
          key={baseContainerId}
          layoutOrder={this.state.layoutOrder}
          onDropComponent={this.dropComponent}
          onMoveComponent={this.moveComponent}
          onDropContainer={this.dropContainer}
          onMoveContainer={this.moveContainer}
        />
      </DroppableDraggableContainer>
    );
  }
}
const mapsStateToProps = (
  state: IAppState,
  props: IDesignerPreviewProvidedProps,
): IDesignerPreviewProps => {
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const selectedLayout = state.formDesigner.layout.selectedLayout;
  return {
    layoutOrder: JSON.parse(
      JSON.stringify(
        state.formDesigner.layout.layouts[selectedLayout]?.order || {},
      ),
    ),
    order: GetLayoutOrderSelector(state),
    activeList: state.formDesigner.layout.activeList,
    dispatch: props.dispatch,
  };
};

export default connect(mapsStateToProps)(DesignView);
