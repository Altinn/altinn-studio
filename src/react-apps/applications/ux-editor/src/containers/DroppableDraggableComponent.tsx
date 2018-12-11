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
  onHoverOver: (
    draggedId: string,
    newPosition: number,
    oldPostition: number,
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
    if (!component) {
      return;
    }
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          const toolbarItem = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (props.id !== 'temporary' && hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          if (!toolbarItem.onDrop) {
            console.warn('Draggable Item doesn\'t have an onDrop-event');
            break;
          }
          toolbarItem.onDrop(
            props.containerId,
            hoverOverIndex,
          );
          break;
        }
        case 'ITEM': {
          const draggedComponent = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (props.id !== 'temporary' && hoverClientY > hoverMiddleY) {
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
          draggedContainer.onDrop(
            props.id,
          );
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

          if (props.id !== 'temporary') {
            props.onHoverOver(
              draggedItem.id,
              props.index,
              draggedItem.index,
            );
          }

          if (hoverClientY > hoverMiddleY) {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex + 1,
              draggedItem.index,
            );
          } else {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex,
              draggedItem.index,
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
            );
          } else {
            props.onHoverOver(
              draggedItem.id,
              hoverOverIndex,
              draggedItem.index,
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
            );
          } else {
            props.onHoverOver(
              draggedContainer.id,
              hoverOverIndex,
              draggedContainer.index,
            );
          }
          break;
        }
      }
    }
  },
};

class DroppableDraggableComponent extends React.Component<IDroppableDraggableContainerProps &
{
  connectDragPreview: ConnectDragPreview;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
  isOver: boolean;
  isDragging: boolean;
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
