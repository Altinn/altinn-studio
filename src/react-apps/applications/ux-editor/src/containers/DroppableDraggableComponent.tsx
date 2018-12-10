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
import { IDroppableDraggableContainerProps } from './DroppableDraggableContainer';

let lastHoveredIndex: number = 0;

export interface IDroppableDraggableComponentProps {
  id: string;
  index: number;
  containerId: string;
  onDropItem: (
    id: string,
    newPosition: number,
    oldPosition: number,
    destinationContainerId: string,
    sourceContainerId: string,
  ) => void;
  onMoveItem: (
    id: string,
    newPosition: number,
    oldPosition: number,
    destinationContainerId: string,
    sourceContainerId: string,
  ) => void;
}

const dragSourceSpec: DragSourceSpec<IDroppableDraggableComponentProps, any> = {
  beginDrag(props: any) {
    return {
      id: props.id,
      containerId: props.containerId,
    };
  },

  isDragging(props: IDroppableDraggableComponentProps, monitor: DragSourceMonitor) {
    return props.id === monitor.getItem().id;
  },
};

const dropTargetSpec: DropTargetSpec<IDroppableDraggableComponentProps> = {
  drop(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor, component: any) {
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          const toolbarItem = monitor.getItem();
          if (!toolbarItem.onDrop) {
            console.warn('Draggable Item doesn\'t have an onDrop-event');
            break;
          }
          toolbarItem.onDrop(props.containerId, props.index);
          break;
        }
        case 'ITEM': {
          const draggedComponent = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          props.onDropItem(
            draggedComponent.id,
            hoverOverIndex,
            draggedComponent.index,
            props.containerId,
            draggedComponent.containerId,
          );
          break;
        }
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();
          props.onDropItem(draggedContainer.id, props.index, draggedContainer.index, props.containerId, draggedContainer.id);
          break;
        }
        default: {
          break;
        }
      }
    }
  },
  canDrop(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor) {
    if (!monitor.isOver({ shallow: true })) {
      return false;
    }
    return true;
  },

  hover(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor, component: any) {
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          break;
        }
        case 'ITEM': {
          const draggedComponent = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (lastHoveredIndex === draggedComponent.index) {
            return;
          }

          if (hoverClientY > hoverMiddleY) {
            if (lastHoveredIndex === hoverOverIndex + 1) {
              return;
            }
            lastHoveredIndex = hoverOverIndex + 1;
          } else {
            lastHoveredIndex = hoverOverIndex;
          }

          props.onMoveItem(
            draggedComponent.id,
            hoverOverIndex,
            draggedComponent.index,
            props.containerId,
            draggedComponent.containerId,
          );
          draggedComponent.index = lastHoveredIndex;
          break;
        }
        case 'CONTAINER': {
          const draggedComponent = monitor.getItem();
          const hoverIndex = props.index;

          if (!monitor.isOver({ shallow: true })) {
            return;
          }

          if (draggedComponent.index === hoverIndex) {
            return;
          }

          // console.log('hovering container', draggedComponent.id, 'at index', props.index, 'in container', props.containerId);
          break;
        }
      }
    }
  }
};

class DroppableDraggableComponent extends React.Component<IDroppableDraggableContainerProps &
{
  connectDragPreview: ConnectDragPreview;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
  isOver: boolean;
},
  any> {
  public render() {
    const {
      connectDropTarget,
      connectDragPreview,
      connectDragSource,
    } = this.props;
    return connectDropTarget(connectDragPreview(connectDragSource(
      <div>
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
    'ITEM',
    dragSourceSpec,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      connectDragPreview: connect.dragPreview(),
      isDragging: monitor.isDragging(),
    }),
  )(
    DroppableDraggableComponent,
  ),
);
