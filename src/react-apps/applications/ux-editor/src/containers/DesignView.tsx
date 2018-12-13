import update from 'immutability-helper';
import * as React from 'react';
import { connect } from 'react-redux';
import { Container } from './TempContainer';
import FormDesignerActionDispatchers from '../actions/formDesignerActions/formDesignerActionDispatcher';

interface IDesignerPreviewProps {
  layoutOrder: IFormLayoutOrder;
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
    };
  }

  public moveComponent = (
    id: string,
    index: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ): void => {
    const { layoutOrder } = this.state;

    if (!id) {
      // dragging a toolbaritem - they don't have ids
      return;
    }
    if (sourceContainerId === destinationContainerId) {
      let updatedOrder: string[] = layoutOrder[sourceContainerId];
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
      const updatedSource: string[] = layoutOrder[sourceContainerId];
      const updatedDestination: string[] = layoutOrder[destinationContainerId];
      if (updatedDestination.indexOf('placeholder') > -1) {
        // remove the placeholder in the destination
        updatedDestination.splice(updatedDestination.indexOf('placeholder'), 1);
      }
      const [moveItem] = updatedSource.splice(layoutOrder[sourceContainerId].indexOf(id), 1);
      updatedDestination.splice(index, 0, moveItem);
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
          $set: true,
        },
      }));
    }
  }

  public dropComponent = (id: string, index: number, sourceContainerId: string, destinationContainerId: string) => {
    this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
      isDragging: {
        $set: false,
      },
    }));
    FormDesignerActionDispatchers.updateFormComponentOrderAction(
      id,
      index,
      destinationContainerId,
      sourceContainerId,
    );
  }

  public moveContainer = (id: string, index: number, sourceContainerId: string, destinationContainerId: string) => {
    console.log('dragging container');
  }

  public dropContainer = () => {
    this.setState((state: IDesignerPreviewState) => update<IDesignerPreviewState>(state, {
      isDragging: {
        $set: false,
      },
    }));
  }

  public render(): JSX.Element {
    const baseContainerId = Object.keys(this.state.layoutOrder).length > 0 ?
      Object.keys(this.state.layoutOrder)[0] :
      null;
    if (!baseContainerId) {
      return null;
    }
    return (
      <Container
        baseContainer={true}
        id={baseContainerId}
        items={this.state.layoutOrder[baseContainerId]}
        onDropComponent={this.dropComponent}
        onMoveComponent={this.moveComponent}
        onDropContainer={this.dropContainer}
        onMoveContainer={this.moveContainer}
      />
    );
  }
}

const makeMapStateToProps = (store: IAppState, _empty: null): IDesignerPreviewProps => ({
  layoutOrder: store.formDesigner.layout.order,
});

export default connect(makeMapStateToProps)(DesignView);
