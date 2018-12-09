import * as React from 'react';
import {
  ConnectDropTarget,
  DropTarget,
  DropTargetConnector,
  DropTargetSpec,
  DropTargetMonitor,
} from 'react-dnd';

export interface IDroppableProps {
  id: string;
  parent: string;
  index?: number;
  notDroppable?: boolean;
  move: (...args: any) => any;
  remove: (...args: any) => any;
}

export interface IDroppablePropsCollected {
  connectDropTarget: ConnectDropTarget;
  isOver: boolean;
  isOverCurrent: boolean;
}

class Droppable extends React.Component<
  IDroppableProps & IDroppablePropsCollected,
  any
  > {
  public render() {
    const { isOverCurrent, connectDropTarget } = this.props;
    const styles = {
      backgroundColor: isOverCurrent ? 'blue' : 'salmon',
    }
    return connectDropTarget(
      <div style={styles}>
        {this.props.children}
      </div>
    );
  }
}

export default (type: string | string[], droppableSpec: DropTargetSpec<IDroppableProps>) =>
  DropTarget(
    type,
    droppableSpec,
    (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
      connectDropTarget: connect.dropTarget(),
      isOver: monitor.isOver(),
      isOverCurrent: monitor.isOver({ shallow: true }),
    }),
  )(
    Droppable,
  );
