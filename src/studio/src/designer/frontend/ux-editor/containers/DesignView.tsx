import update from 'immutability-helper';
import * as React from 'react';
import { connect } from 'react-redux';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';
import { makeGetLayoutOrderSelector } from '../selectors/getLayoutData';
import { Container } from './Container';
import DroppableDraggableContainer from './DroppableDraggableContainer';

interface IDesignerPreviewProps {
  layoutOrder: IFormLayoutOrder;
  order: any[];
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
    }
  }

  public getStatefullIndexOfContainer = (
    containerId: string,
    parentContainerId: string = Object.keys(this.props.layoutOrder)[0],
  ): number => {
    return this.state.layoutOrder[parentContainerId].indexOf(containerId);
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
    FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order);
  }

  public dropComponent = (id: string, sourceContainerId: string, destinationContainerId: string) => {
    if (sourceContainerId !== destinationContainerId) {
      // If a component has been dropped in a different container, add component to container.
      // The handling of a component that is dragged within a container is done in onMoveComponent and handled on the fly
      const { layoutOrder } = this.state;
      const updatedSource: string[] = layoutOrder[sourceContainerId];
      const updatedDestination: string[] = layoutOrder[destinationContainerId];
      const [moveItem] = updatedSource.splice(layoutOrder[sourceContainerId].indexOf(id), 1);
      updatedDestination?.push(moveItem);
      FormDesignerActionDispatchers.updateFormComponentOrderAction(JSON.parse(JSON.stringify(this.state.layoutOrder)));
      this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
        layoutOrder: {
          [sourceContainerId]: {
            $set: [...updatedSource],
          },
          [destinationContainerId]: {
            $set: [...updatedDestination],
          },
        },
        isDragging: {
          $set: false,
        },
      }));
      FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order);
    } else {
      FormDesignerActionDispatchers.updateFormComponentOrderAction(this.state.layoutOrder);
      this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
        isDragging: {
          $set: false,
        },
      }));
      FormDesignerActionDispatchers.updateActiveListOrder(this.props.activeList, this.props.order);
    }
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
  return {
    layoutOrder: JSON.parse(JSON.stringify(state.formDesigner.layout.order)),
    order: GetLayoutOrderSelector(state),
    activeList: state.formDesigner.layout.activeList,
  };
};

export default connect(mapsStateToProps)(DesignView);
