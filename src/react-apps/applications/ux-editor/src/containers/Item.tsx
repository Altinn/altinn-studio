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
import Tree from './Tree';

const dragSourceSpec: DragSourceSpec<IItemProps, any> = {
  beginDrag(props: any) {
    return {
      id: props.id,
      parent: props.parent,
      items: props.item.children,
    };
  },

  isDragging(props: IItemProps, monitor: DragSourceMonitor) {
    return props.id === monitor.getItem().id;
  },
};

const dropTargetSpec: DropTargetSpec<IItemProps> = {
  canDrop() {
    return false;
  },

  hover(props: IItemProps, monitor: DropTargetMonitor) {
    const {id: draggedId} = monitor.getItem();
    const {id: overId} = props;

    if (draggedId === overId || draggedId === props.parent) {
      console.log('Dragging the parent');
      return;
    }
    if (!monitor.isOver({shallow: true})) {
      console.log('is not over')
      return;
    }

    props.move(draggedId, overId, props.parent);
  },
};

export interface IItemProps {
  id: any;
  parent: any;
  item: any;
  move: (...args: any) => any;
  find: (...args: any) => any;
}

class Item extends React.Component<IItemProps &
  {
    connectDragPreview: ConnectDragPreview,
    connectDragSource: ConnectDragSource,
    connectDropTarget: ConnectDropTarget,
  },
    any
  > {
  public render() {
    console.log('item props', this.props);
    const {
      connectDropTarget,
      connectDragPreview,
      connectDragSource,
      item: {
        id,
        title,
        children,
      },
      move,
      find,
    } = this.props;

    return connectDropTarget(connectDragPreview(
      <div>
        {connectDragSource(
          <div
            style={{
              background: 'white',
              border: '1px solid #ccc',
              padding: '1em',
              marginBottom: -1,
            }}
          >
          {title}
          </div>,
        )}
        <Tree
          parent={id}
          items={children}
          move={move}
          find={find}
        />
      </div>,
    ));
  }
}

export default DropTarget('ITEM', dropTargetSpec, (connect: DropTargetConnector) => ({
  connectDropTarget: connect.dropTarget(),
}))(DragSource('ITEM', dragSourceSpec, (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
}))(Item));
