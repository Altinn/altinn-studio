/* eslint-disable react/no-find-dom-node */
import React from 'react';
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
import ReactDOM from 'react-dom';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';

const dragSourceSpec: DragSourceSpec<IDroppableDraggableContainerProps, any> = {
  beginDrag(props: IDroppableDraggableContainerProps) {
    return {
      ...props,
    };
  },
  canDrag(props: IDroppableDraggableContainerProps) {
    if (!props.canDrag) {
      return false;
    }
    return true;
  },
  isDragging(
    props: IDroppableDraggableContainerProps,
    monitor: DragSourceMonitor,
  ) {
    return props.id === monitor.getItem().id;
  },
};

const dropTargetSpec: DropTargetSpec<IDroppableDraggableContainerProps> = {
  drop(
    props: IDroppableDraggableContainerProps,
    monitor: DropTargetMonitor,
    Component: React.Component,
  ) {
    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'TOOLBAR_ITEM': {
          const toolbarItem = monitor.getItem();
          if (!toolbarItem.onDrop) {
            console.warn("Draggable Item doesn't have an onDrop-event");
            break;
          }
          toolbarItem.onDrop(props.id);
          break;
        }
        case 'ITEM': {
          const draggedComponent = monitor.getItem();
          let hoverOverIndex = props.index;
          const hoverBoundingRect = (
            ReactDOM.findDOMNode(Component) as Element
          ).getBoundingClientRect();
          const hoverMiddleY =
            (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          }

          props.onDropComponent(
            draggedComponent.id,
            draggedComponent.containerId,
            props.id,
          );

          draggedComponent.index = hoverOverIndex;
          break;
        }
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();

          if (props.baseContainer) {
            // We can't get the index here, so let's not do anything
            props.onDropContainer(
              draggedContainer.id,
              props.id,
              draggedContainer.parentContainerId,
            );
            break;
          } else {
            props.onDropContainer(
              draggedContainer.id,
              props.id,
              draggedContainer.containerId,
            );
          }
          break;
        }
        default: {
          break;
        }
      }
    }
  },
  hover(
    props: IDroppableDraggableContainerProps,
    monitor: DropTargetMonitor,
    component: any,
  ) {
    if (!component) {
      return;
    }

    if (monitor.isOver({ shallow: true })) {
      switch (monitor.getItemType()) {
        case 'CONTAINER': {
          const draggedContainer = monitor.getItem();
          let hoverOverIndex = props.index;

          const hoverBoundingRect = (
            ReactDOM.findDOMNode(component) as Element
          ).getBoundingClientRect();
          const hoverMiddleY =
            (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (
            draggedContainer.id === props.id ||
            draggedContainer.index === props.index ||
            draggedContainer.containerId === props.id
          ) {
            return;
          }

          if (!hoverOverIndex) {
            hoverOverIndex = props.getIndex(draggedContainer.containerId);
            if (hoverOverIndex < 0) {
              return;
            }
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
            if (hoverOverIndex === draggedContainer.index) {
              return;
            }
          }

          props.onMoveContainer(
            draggedContainer.id,
            hoverOverIndex,
            draggedContainer.parentContainerId,
            draggedContainer.parentContainerId,
          );

          draggedContainer.index = hoverOverIndex;

          break;
        }
        case 'ITEM': {
          const draggedItem = monitor.getItem();
          let hoverOverIndex = props.index;
          const hoverBoundingRect = (
            ReactDOM.findDOMNode(component) as Element
          ).getBoundingClientRect();
          const hoverMiddleY =
            (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          if (
            draggedItem.id === props.id ||
            draggedItem.index === props.index ||
            draggedItem.containerId === props.id
          ) {
            return;
          }

          if (!hoverOverIndex) {
            hoverOverIndex = props.getIndex(draggedItem.containerId);
          }

          if (hoverClientY > hoverMiddleY) {
            hoverOverIndex += 1;
          } else {
            hoverOverIndex -= 1;
            if (hoverOverIndex < 0) {
              hoverOverIndex = 0;
            }
          }

          props.onMoveComponent(
            draggedItem.id,
            hoverOverIndex,
            draggedItem.containerId,
            props.id,
          );

          draggedItem.index = hoverOverIndex;
          draggedItem.containerId = props.id;

          break;
        }
        default: {
          break;
        }
      }
    }
  },
};

export interface IDroppableDraggableContainerProps {
  baseContainer: boolean;
  canDrag: boolean;
  id: string;
  index?: number;
  parentContainerId?: string;
  getIndex?: (containerId: string, parentContainerId?: string) => number;
  onMoveComponent?: (...args: any) => void;
  onDropComponent?: (...args: any) => void;
  onMoveContainer?: (...args: any) => void;
  onDropContainer?: (...args: any) => void;
}

class DroppableDraggableContainer extends React.Component<
  IDroppableDraggableContainerProps & {
    connectDragPreview: ConnectDragPreview;
    connectDragSource: ConnectDragSource;
    connectDropTarget: ConnectDropTarget;
    isOver: boolean;
  },
  any
> {
  public render() {
    const { connectDropTarget, connectDragPreview, connectDragSource, isOver } =
      this.props;
    return connectDropTarget(
      connectDragPreview(
        connectDragSource(
          <div
            style={{
              backgroundColor: isOver
                ? 'white'
                : altinnTheme.altinnPalette.primary.greyLight,
              paddingLeft: '1.2rem',
              paddingRight: '1.2rem',
              paddingTop: this.props.baseContainer ? '1.2rem' : '',
              border: this.props.parentContainerId ? '' : '1px solid #ccc',
              marginBottom: this.props.baseContainer ? '' : '12px',
            }}
          >
            {this.props.children}
          </div>,
        ),
      ),
    );
  }
}

export default DropTarget(
  ['TOOLBAR_ITEM', 'CONTAINER', 'ITEM'],
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
  )(DroppableDraggableContainer),
);
