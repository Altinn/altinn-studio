import * as React from 'react';
import {
  ConnectDragSource,
  ConnectDropTarget,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd';
import { findDOMNode } from 'react-dom';

const itemSource = {
  beginDrag(props: ItemProps) {
    return {
      id: props.id,
      index: props.index,
    };
  },
  canDrag(props: ItemProps) {
    if (props.baseContainer) {
      return false;
    }
    return true;
  },
};

let lastHoveredIndex: number;

const itemTarget = {
  hover(props: ItemProps, monitor: DropTargetMonitor, component: Item | null): void {
    switch (monitor.getItemType()) {
      case 'item': {
        if (!component) {
          return null;
        }

        const dragIndex = monitor.getItem().index;
        const hoverIndex = props.index;

        if (dragIndex === hoverIndex) {
          lastHoveredIndex = component.props.index;
          return;
        }

        const otherElement = (findDOMNode(
          component,
        ) as Element);

        const otherElementBoundingRect = otherElement.getBoundingClientRect();

        const otherElementHeight = otherElementBoundingRect.bottom - otherElementBoundingRect.top;

        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset.y - otherElementBoundingRect.top;

        if (hoverClientY > (otherElementHeight / 2)) {
          // Insert under
          lastHoveredIndex = component.props.index + 1;
          return;
        }
        if (hoverClientY < (otherElementHeight / 2)) {
          // Insert over (or at the same index and push the other component down)
          lastHoveredIndex = component.props.index;
          return;
        }

        props.onMoveItem(dragIndex, lastHoveredIndex);
        lastHoveredIndex = hoverIndex;
        break;
      }
      case 'item-toolbar': {
        if (!component) {
          return;
        }

        const otherElement = (findDOMNode(
          component,
        ) as Element);

        const otherElementBoundingRect = otherElement.getBoundingClientRect();

        const otherElementHeight = otherElementBoundingRect.bottom - otherElementBoundingRect.top;

        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset.y - otherElementBoundingRect.top;

        if (hoverClientY > (otherElementHeight / 2)) {
          // Insert under
          lastHoveredIndex = component.props.index + 1;
          return;
        }
        if (hoverClientY < (otherElementHeight / 2)) {
          // Insert over (or at the same index and push the other component down)
          lastHoveredIndex = component.props.index;
          return;
        }
      }
      default: {
        break;
      }
    }
  },
  drop(props: ItemProps, monitor: DropTargetMonitor) {
    if (!monitor.didDrop()) {
      return;
    }
    const itemType = monitor.getItemType();
    if (itemType === 'item-toolbar') {
      monitor.getItem().onDropAction(lastHoveredIndex, props.id);
    } else if (itemType === 'item') {
      props.onMoveItemDone(monitor.getItem().id, lastHoveredIndex);
    }
  },
};

export interface ItemProps {
  id: any;
  index: number;
  onMoveItem: (dragIndex: number, hoverIndex: number) => void;
  onMoveItemDone: (id: string, index: number) => void;
  onHoverNewItem: (hoverIndex: number) => void;
  baseContainer?: boolean;
}

interface ItemSourceCollectedProps {
  isDragging: boolean;
  connectDragSource: ConnectDragSource;
}

interface ItemTargetCollectedProps {
  connectDropTarget: ConnectDropTarget;
}

class Item extends React.Component<
  ItemProps & ItemSourceCollectedProps & ItemTargetCollectedProps
  > {
  public render() {
    const {
      index,
      connectDragSource,
      connectDropTarget,
    } = this.props;

    return connectDragSource(
      connectDropTarget(<div key={index}>{this.props.children}</div>),
    );
  }
}

export default DropTarget<ItemProps, ItemTargetCollectedProps>(
  ['item', 'item-toolbar'],
  itemTarget,
  (connect: DropTargetConnector) => ({
    connectDropTarget: connect.dropTarget(),
  }),
)(
  DragSource<ItemProps, ItemSourceCollectedProps>(
    'item',
    itemSource,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    }),
  )(Item),
);
