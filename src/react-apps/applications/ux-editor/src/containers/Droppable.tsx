import * as React from 'react';
import {
  ConnectDropTarget,
  DropTarget,
  DropTargetConnector,
  DropTargetSpec,
} from 'react-dnd';

export interface IDroppableProps {
  id?: string;
  notDroppable?: boolean;
}

export interface IDroppablePropsCollected {
  connectDropTarget: ConnectDropTarget;
}

class Droppable extends React.Component<
  IDroppableProps & IDroppablePropsCollected,
  any
  > {
  public render() {
    const { connectDropTarget } = this.props;
    return connectDropTarget(
      <div>
        {this.props.children}
      </div>,
    );
  }
}

export default (type: string, droppableSpec: DropTargetSpec<IDroppableProps>) =>
  DropTarget(
    type,
    droppableSpec,
    (connect: DropTargetConnector) => ({
      connectDropTarget: connect.dropTarget(),
    }),
  )(
    Droppable,
  );
