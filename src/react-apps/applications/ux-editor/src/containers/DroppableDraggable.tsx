import * as React from 'react';
import * as ReactDOM from 'react-dom';
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

const dragSourceSpec: DragSourceSpec<IItemProps, any> = {
  beginDrag(props: any) {
    return {
      id: props.id,
      parent: props.parent,
    };
  },

  isDragging(props: IItemProps, monitor: DragSourceMonitor) {
    return props.id === monitor.getItem().id;
  },
};

const dropTargetSpec: DropTargetSpec<IItemProps> = {
  drop(props: IItemProps, monitor: DropTargetMonitor) {
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
        const component = monitor.getItem();
        if (monitor.isOver({ shallow: true }) && monitor.didDrop()) {
          console.log('Moved component into DroppableDraggable', component.id);
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
  },
  canDrop(props: IItemProps, monitor: DropTargetMonitor) {
    if (!monitor.isOver({ shallow: true })) {
      return false;
    }
    return true;
  },

  hover(props: IItemProps, monitor: DropTargetMonitor, component: any) {
    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;
    const sourceListId = monitor.getItem().listId;
    const { id: draggedId } = monitor.getItem();
    const { id: overId } = props;

    if (draggedId === overId || draggedId === props.parent) {
      // Hover over itself (wtf?)
      return;
    }

    if (dragIndex === hoverIndex) {
      return;
    }

    // Determine rectangle on screen
    const hoverBoundingRect = (ReactDOM.findDOMNode(component) as Element).getBoundingClientRect();

    // Get vertical middle
    const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

    // Determine mouse position
    const clientOffset = monitor.getClientOffset();

    // Get pixels to the top
    const hoverClientY = clientOffset.y - hoverBoundingRect.top;

    // Only perform the move when the mouse has crossed half of the items height
    // When dragging downwards, only move when the cursor is below 50%
    // When dragging upwards, only move when the cursor is above 50%

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // Time to actually perform the action
    if (props.id === sourceListId) {
      props.move(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      monitor.getItem().index = hoverIndex;
    }
  },
};

export interface IItemProps {
  id: any;
  index: number;
  parent: string;
  move: (...args: any) => any;
  remove: (...args: any) => any;
}

class Item extends React.Component<IItemProps &
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

export default DropTarget(['ITEM', 'TOOLBAR_ITEM', 'CONTAINER'], dropTargetSpec, (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver({ shallow: true })
}))(
  DragSource('CONTAINER', dragSourceSpec, (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  }))(Item));
