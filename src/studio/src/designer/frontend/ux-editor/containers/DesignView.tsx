/* eslint-disable no-undef */
import update from 'immutability-helper';
import * as React from 'react';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { Container } from './Container';
import DroppableDraggableContainer from './DroppableDraggableContainer';

interface IDesignerPreviewProps {
  layoutOrder: IFormLayoutOrder;
  order: IFormLayoutOrder;
  activeList: any[];
}

interface IDesignerPreviewState extends IDesignerPreviewProps {
  isDragging: boolean;
}

class DesignView extends React.Component<IDesignerPreviewProps, IDesignerPreviewState> {
  public static getDerivedStateFromProps(nextProps: IDesignerPreviewProps, prevState: IDesignerPreviewState) {
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
      this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
        layoutOrder: {
          [sourceContainerId]: {
            $set: [...updatedOrder],
          },
        },
        isDragging: {
          $set: true,
        },
      }));
    } else {
      // Moving to different container
      // If element is still inside old container => remove from old and place in the new conatiner
      const { layoutOrder } = this.state;
      const updatedOrderSource: string[] = layoutOrder[sourceContainerId];
      const updatedOrderDestination: string[] = layoutOrder[destinationContainerId];
      if (updatedOrderSource.indexOf(id) > -1) {
        // Remove component from source, place in dest layoutOrder
        const [moveItem] = updatedOrderSource.splice(updatedOrderSource.indexOf(id), 1);
        updatedOrderDestination.splice(index, 0, moveItem);
        this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
          layoutOrder: {
            [destinationContainerId]: {
              $set: [...updatedOrderDestination],
            },
            [sourceContainerId]: {
              $set: [...updatedOrderSource],
            },
          },
          isDragging: {
            $set: true,
          },
        }));
      } else {
        // The component has been dragged to an unknown container, locate the container and remove
        const container = Object.keys(layoutOrder).find((containerId: string) => {
          return layoutOrder[containerId].includes(id);
        });
        const [movedComponent] = layoutOrder[container].splice(layoutOrder[container].indexOf(id), 1);
        if (!movedComponent) {
          return;
        }
        updatedOrderDestination.splice(index, 0, movedComponent);
        this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
          layoutOrder: {
            [destinationContainerId]: {
              $set: [...updatedOrderDestination],
            },
            [container]: {
              $set: [...layoutOrder[container]],
            },
          },
          isDragging: {
            $set: true,
          },
        }));
      }
    }
  }

  public getStatefullIndexOfContainer = (
    containerId: string,
    parentContainerId: string = Object.keys(this.props.layoutOrder)[0],
  ): number => {
    if (containerId === parentContainerId) {
      return 0;
    }
    return this.state.layoutOrder[parentContainerId]?.indexOf(containerId);
  }

  public moveContainer = (id: string, index: number, sourceContainerId: string, destinationContainerId: string) => {
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
      this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
        layoutOrder: {
          [sourceContainerId]: {
            $set: [...updatedOrder],
          },
        },
        isDragging: {
          $set: true,
        },
      }));
    } else {
      const { layoutOrder } = this.state;
      const updatedSource: string[] = layoutOrder[sourceContainerId];
      const updatedDestination: string[] = layoutOrder[destinationContainerId];
      if (updatedDestination?.indexOf('placeholder') > -1) {
        // remove the placeholder in the destination (if there is one)
        updatedDestination.splice(updatedDestination.indexOf('placeholder'), 1);
      }
      const [movedContainer] = updatedSource.splice(layoutOrder[sourceContainerId].indexOf(id), 1);
      updatedDestination?.splice(index, 0, movedContainer);
      this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
        layoutOrder: {
          [destinationContainerId]: {
            $set: [...updatedDestination],
          },
        },
        isDragging: {
          $set: true,
        },
      }));
    }
  }

  public dropContainer = () => {
    FormDesignerActionDispatchers.updateFormComponentOrderAction(
      this.state.layoutOrder,
    );
    this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
      isDragging: {
        $set: false,
      },
    }));
    FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order as any);
  }

  public dropComponent = () => {
    FormDesignerActionDispatchers.updateFormComponentOrderAction(this.state.layoutOrder);
    this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
      isDragging: {
        $set: false,
      },
    }));
    FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order as any);
  }

  public render(): JSX.Element {
    const baseContainerId = Object.keys(this.state.layoutOrder).length > 0 ?
      Object.keys(this.state.layoutOrder)[0] :
      null;
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
): IDesignerPreviewProps => {
  const GetLayoutOrderSelector = makeGetLayoutOrderSelector();
  const selectedLayout = state.formDesigner.layout.selectedLayout;
  return {
    layoutOrder: JSON.parse(JSON.stringify(state.formDesigner.layout.layouts[selectedLayout]?.order || {})),
    order: GetLayoutOrderSelector(state),
    activeList: state.formDesigner.layout.activeList,
  };
};

export default connect(mapsStateToProps)(DesignView);
