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
  drop(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor) {
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
  canDrop(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor) {
    if (!monitor.isOver({ shallow: true })) {
      return false;
    }
    return true;
  },

  hover(props: IDroppableDraggableComponentProps, monitor: DropTargetMonitor, component: any) {
    const draggedComponent = monitor.getItem();
    const hoverIndex = props.index;

    if (!monitor.isOver({ shallow: true })) {
      return;
    }

    if (draggedComponent.index === hoverIndex) {
      return;
    }

    console.log('hovering', draggedComponent.id, 'at index', props.index, 'in container', props.containerId);

    // // Determine rectangle on screen
    // const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();

    // // Get vertical middle
    // const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

    // // Determine mouse position
    // const clientOffset = monitor.getClientOffset();

    // // Get pixels to the top
    // const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // // Only perform the move when the mouse has crossed half of the items height
    // // When dragging downwards, only move when the cursor is below 50%
    // // When dragging upwards, only move when the cursor is above 50%

    // // Dragging downwards
    // if (draggedComponent.index < hoverIndex && hoverClientY < hoverMiddleY) {
    //   return;
    // }

    // // Dragging upwards
    // if (draggedComponent.index > hoverIndex && hoverClientY > hoverMiddleY) {
    //   return;
    // }

    // // Time to actually perform the action
    // if (props.id === sourceListId) {
    //   props.move(draggedComponent.id, props.id, hoverIndex);

    //   // Note: we're mutating the monitor item here!
    //   // Generally it's better to avoid mutations,
    //   // but it's good here for the sake of performance
    //   // to avoid expensive index searches.
    //   monitor.getItem().index = hoverIndex;
  },
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
