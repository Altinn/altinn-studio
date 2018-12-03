import * as React from 'react';
import {
  ConnectDragSource,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
} from 'react-dnd';

export interface IDraggableToolbarItemProps {
  onDropAction: any;
}

export interface IDraggableToolbarItemCollectedProps {
  isDragging: boolean;
  connectDragSource: ConnectDragSource;
}

class DraggableToolbarItem extends React.Component<
  IDraggableToolbarItemProps &
  IDraggableToolbarItemCollectedProps,
  any
  > {
  public render() {
    const { connectDragSource } = this.props;
    return connectDragSource(
      <div>
        {this.props.children}
      </div>,
    );
  }
}

const DraggableToolbarItemSpec = {
  beginDrag(props: IDraggableToolbarItemProps) {
    return {
      onDropAction: props.onDropAction,
    };
  },
};

function DraggableToolbarItemMonitor(connect: DragSourceConnector, monitor: DragSourceMonitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

export default DragSource('item-toolbar', DraggableToolbarItemSpec, DraggableToolbarItemMonitor)(DraggableToolbarItem);
