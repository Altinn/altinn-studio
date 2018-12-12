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
import * as ReactDOM from 'react-dom';

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
    if (props.notDroppable && !monitor.isOver({ shallow: true })) {
      return false;
    }
    return true;
  },
  hover(props: IDroppableDraggableContainerProps, monitor: DropTargetMonitor, component: any) {
    if (!component) {
      return;
    }
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          const draggedItem = monitor.getItem();
          const hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY > hoverMiddleY) {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex + 1,
              draggedItem.index,
              draggedItem.containerId,
              props.id,
            );
          } else {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex,
              draggedItem.index,
              props.id,
              props.id,
            );
          }
          break;
        }
        case 'ITEM': {
          const draggedItem = monitor.getItem();
          const hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY > hoverMiddleY) {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex + 1,
              draggedItem.index,
              draggedItem.containerId,
              props.id,
            );
          } else {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex,
              draggedItem.index,
              draggedItem.containerId,
              props.id,
            );
          }

          break;
        }
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();
          const hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY > hoverMiddleY) {
            props.onHoverOver(
              draggedContainer.id,
              hoverOverIndex + 1,
              draggedContainer.index,
              draggedContainer.containerId,
              props.id,
            );
          } else {
            props.onHoverOver(
              draggedContainer.id,
              hoverOverIndex,
              draggedContainer.index,
              draggedContainer.containerId,
              props.id,
            );
          }
          break;
        }
      }
    }
  }
};

export interface IDroppableDraggableContainerProps {
  id: any;
  notDroppable: boolean;
  canDrag: boolean;
  index: number;
  onDropItem: (
    id: string,
    newPositionIndex: number,
    destinationContainerId: string,
    sourceContainerId: string,
  ) => void;
  onHoverOver: (
    draggedId: string,
    newPosition: number,
    oldPostition: number,
    sourceContainerId: string,
    destinationContainerId: string,
  ) => void;
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
