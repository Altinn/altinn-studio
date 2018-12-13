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

export interface IDroppableDraggableComponentProps {
  id: string;
  index: number;
  containerId: string;
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
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
          console.log('index', hoverOverIndex);
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

          if (draggedComponent.id === props.id) {
            return;
          }

          if (hoverOverIndex === draggedComponent.index) {
            return;
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          props.onDropComponent(
            draggedComponent.id,
            hoverOverIndex,
            draggedComponent.containerId,
            component.props.containerId,
          );

          draggedComponent.index = hoverOverIndex;
          break;
        }
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();
          let hoverOverIndex = props.index;

          if (!draggedContainer.onDrop) {
            return;
          }

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (draggedContainer.id === props.id) {
            return;
          }

          if (hoverOverIndex === draggedContainer.index) {
            return;
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          props.onDropContainer(
            draggedContainer.id,
            hoverOverIndex,
            props.id,
            draggedContainer.containerId,
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

          if (hoverClientY > hoverMiddleY) {
            props.onMoveComponent(
              draggedItem.id,
              hoverOverIndex + 1,
              null, // Toolbar items doesn't have a container
              props.containerId,
            );
          } else {
            props.onMoveComponent(
              draggedItem.id,
              hoverOverIndex,
              null, // Toolbar items doesn't have a container
              props.containerId,
            );
          }
          break;
        }
        case 'ITEM': {
          const draggedItem = monitor.getItem();
          let hoverOverIndex = props.index;
          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (draggedItem.id === props.id || draggedItem.index === props.index) {
            return;
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          props.onMoveComponent(
            draggedItem.id,
            hoverOverIndex,
            draggedItem.containerId,
            component.props.containerId,
          );

          break;
        }
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (draggedContainer.id === props.id) {
            return;
          }

          if (hoverClientY > hoverMiddleY || props.id !== 'placeholder') {
            hoverOverIndex += 1;
          }

          props.onMoveContainer(
            draggedContainer.id,
            hoverOverIndex,
            draggedContainer.id,
            draggedContainer.id,
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
};

class DroppableDraggableComponent extends React.Component<IDroppableDraggableComponentProps &
{
  connectDragPreview: ConnectDragPreview;
  connectDragSource: ConnectDragSource;
  connectDropTarget: ConnectDropTarget;
  dropTargetMonitor: DropTargetMonitor;
  isDragging: boolean;
},
  any> {
  public render() {
    const {
      id,
      connectDropTarget,
      connectDragPreview,
      connectDragSource,
      isDragging,
    } = this.props;
    return connectDropTarget(connectDragPreview(connectDragSource(
      <div
        key={id}
        style={{
          visibility: isDragging ? 'hidden' : 'visible',
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
    dropTargetMonitor: monitor,
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
