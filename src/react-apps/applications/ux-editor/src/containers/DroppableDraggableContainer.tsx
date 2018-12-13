import * as React from 'react';
import {
  ConnectDragPreview,
  ConnectDragSource,
  ConnectDropTarget,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
  DropTargetSpec,
} from 'react-dnd';

const dragSourceSpec: DragSourceSpec<IDroppableDraggableContainerProps, any> = {
  beginDrag(props: IDroppableDraggableContainerProps) {
    return {
      id: props.id,
    };
  },
  canDrag(props: IDroppableDraggableContainerProps) {
    if (!props.canDrag) {
      return false;
    }
    return true;
  },
  isDragging(props: IDroppableDraggableContainerProps, monitor: DragSourceMonitor) {
    return props.id === monitor.getItem().id;
  },
};

const dropTargetSpec: DropTargetSpec<IDroppableDraggableContainerProps> = {
  drop(props: IDroppableDraggableContainerProps, monitor: DropTargetMonitor) {
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          const toolbarItem = monitor.getItem();
          if (!toolbarItem.onDrop) {
            console.warn('Draggable Item doesn\'t have an onDrop-event');
            break;
          }
          console.log('calling toolbarItem.onDrop with', props);
          toolbarItem.onDrop(props.id);
          break;
        }
      }
    }
  },
  canDrop(props: IDroppableDraggableContainerProps, monitor: DropTargetMonitor) {
    return false;
  },
};

export interface IDroppableDraggableContainerProps {
  baseContainer: boolean;
  canDrag: boolean;
  id: string;
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
}

class DroppableDraggableContainer extends React.Component<IDroppableDraggableContainerProps &
{
  connectDragPreview: ConnectDragPreview;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
  isOver: boolean;
},
  any
  > {
  public render() {
    const {
      connectDropTarget,
      connectDragPreview,
      connectDragSource,
    } = this.props;

    return connectDropTarget(connectDragPreview(connectDragSource(
      <div
        style={{
          border: '1px solid #ccc',
          padding: '1em',
          marginBottom: -1,
        }}
      >
        {this.props.children}
      </div>,
    )));
  }
}

export default DropTarget(
  ['ITEM', 'TOOLBAR_ITEM', 'CONTAINER'],
  dropTargetSpec,
  (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver({ shallow: true }),
  }),
)(
  DragSource(
    'CONTAINER',
    dragSourceSpec,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      connectDragPreview: connect.dragPreview(),
      isDragging: monitor.isDragging(),
    }),
  )(
    DroppableDraggableContainer,
  ),
);
