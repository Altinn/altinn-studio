import { XYCoord } from 'dnd-core';
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
          return;
        }

        const hoverBoundingRect = (findDOMNode(
          component,
        ) as Element).getBoundingClientRect();

        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = (clientOffset as XYCoord).y - hoverBoundingRect.top;
        if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
          return;
        }

        if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
          return;
        }

        props.onMoveItem(dragIndex, hoverIndex);
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
        const hoverClientY = (clientOffset as XYCoord).y - otherElementBoundingRect.top;

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
      if (lastHoveredIndex === undefined) {
        lastHoveredIndex = 0;
      }
      monitor.getItem().onDropAction(lastHoveredIndex, props.id);
    } else if (itemType === 'item') {
      if (lastHoveredIndex === undefined) {
        lastHoveredIndex = 0;
      }
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
      connectDragSource,
      connectDropTarget,
    } = this.props;

    return connectDragSource(
      connectDropTarget(<div>{this.props.children}</div>),
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
