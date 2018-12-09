import {
  SourceType,
  TargetType,
} from 'dnd-core';
import * as React from 'react';
import {
  ConnectDragSource,
  ConnectDropTarget,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
  DropTarget,
  DropTargetConnector,
  DropTargetSpec,
} from 'react-dnd';

export interface IDraggableDroppableProps {
  id: string;
  notDroppable?: boolean;
  onDrop?: (...args: any) => any;
}

interface IDraggableDroppablePropsDragCollected {
  connectDragSource: ConnectDragSource;
}

interface IDraggableDroppablePropsDropCollected {
  connectDropTarget: ConnectDropTarget;
}

class DraggableDroppable extends React.Component<
  IDraggableDroppableProps &
  IDraggableDroppablePropsDragCollected &
  IDraggableDroppablePropsDropCollected,
  any
  > {
  public render() {
    const { id, connectDragSource, connectDropTarget } = this.props;
    return connectDragSource(connectDropTarget(
      <div>
        <div key={id}>
          {this.props.children}
        </div>
        {connectDropTarget(
          <div>
            Drop
          </div>
        )}
      </div>
      ,
    ));
  }
}

export default (
  dropTargetType: TargetType,
  dragTargetType: SourceType,
  dropTargetSpec: DropTargetSpec<IDraggableDroppableProps>,
  dragSourceSpec: DragSourceSpec<IDraggableDroppableProps, any>,
) => DragSource(
  dragTargetType,
  dragSourceSpec,
  (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
    connectDragSource: connect.dragSource(),
  }),
)(
  DropTarget(
    dropTargetType,
    dropTargetSpec,
    (connect: DropTargetConnector) => ({
      connectDropTarget: connect.dropTarget(),
    }),
  )(DraggableDroppable),
);
