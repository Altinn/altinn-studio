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
        case 'ITEM': {
          // const component = monitor.getItem();
          if (monitor.isOver({ shallow: true }) && monitor.didDrop()) {
            // component.move(component.id, props.id);
          }
          break;
        }
        case 'CONTAINER': {
          console.log('droppable dropped container', props.id);
          break;
        }
        default: {
          break;
        }
      }
    }
  },
  canDrop(props: IDroppableDraggableContainerProps, monitor: DropTargetMonitor) {
    if (props.notDroppable && !monitor.isOver({ shallow: true })) {
      return false;
    }
    return true;
  },
};

export interface IDroppableDraggableContainerProps {
  id: any;
  notDroppable: boolean;
  canDrag: boolean;
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
      isOver,
    } = this.props;

    return connectDropTarget(connectDragPreview(connectDragSource(
      <div
        style={{
          background: isOver ? 'blue' : 'white',
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
