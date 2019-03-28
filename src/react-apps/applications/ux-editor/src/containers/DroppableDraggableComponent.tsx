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
  canDrag: boolean;
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
}

const dragSourceSpec: DragSourceSpec<IDroppableDraggableComponentProps, any> = {
  beginDrag(props: any) {
    return {
      ...props,
    };
  },

  isDragging(props: IDroppableDraggableComponentProps, monitor: DragSourceMonitor) {
    return props.id === monitor.getItem().id;
  },
  canDrag(props: IDroppableDraggableComponentProps) {
    return props.canDrag;
  },
  endDrag(props: IDroppableDraggableComponentProps, monitor: DragSourceMonitor, component: any) {
    if (!monitor.didDrop()) {
      const draggedComponent = monitor.getItem();

      props.onDropComponent(
        draggedComponent.id,
        props.containerId,
        component.props.containerId,
      );
    }
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
          props.onDropComponent(
            draggedComponent.id,
            props.containerId,
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

          if (hoverOverIndex === draggedContainer.index) {
            return;
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }
          props.onDropContainer(
            draggedContainer.id,
            hoverOverIndex,
            props.containerId,
            draggedContainer.parentContainerId,
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

          monitor.getItem().index = hoverOverIndex;
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

          if (hoverClientY > hoverMiddleY && props.id !== 'placeholder') {
            hoverOverIndex += 1;
          }

          props.onMoveContainer(
            draggedContainer.id,
            hoverOverIndex,
            props.containerId,
            component.props.containerId,
          );

          monitor.getItem().index = hoverOverIndex;
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
    const style = isDragging ? {
      opacity: 0,
    } : null;
    return connectDropTarget(connectDragPreview(connectDragSource(
      <div
        key={id}
        style={style}
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
