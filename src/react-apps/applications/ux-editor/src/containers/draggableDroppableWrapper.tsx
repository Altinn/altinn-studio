/*tslint:disable:max-classes-per-file*/
import { XYCoord } from 'dnd-core';
import * as React from 'react';
import {
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd';
import * as ReactDom from 'react-dom';

const draggableDroppableSource = {
  beginDrag(props: any) {
    return {
      id: props.id,
      index: props.index,
    };
  },
  canDrag(props: any) {
    if (props.baseContainer) {
      return false;
    }
    return true;
  },
};

const draggableDroppableTarget = {
  hover(props: any, monitor: DropTargetMonitor, component: any | null) {
    if (!component) {
      return;
    }

    const dragIndex = monitor.getItem().index;
    const hoverIndex = props.index;

    if (dragIndex === hoverIndex) {
      return;
    }

    const hoverBoundingRect = (ReactDom.findDOMNode(
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

    props.updateIndex(dragIndex, hoverIndex);

    // monitor.getItem().index = hoverIndex;
  },
  drop(props: any, monitor: DropTargetMonitor) {
    if (!monitor.didDrop()) {
      return;
    }
    props.onDrop(monitor.getItem());
  },
};

class DraggableDroppable extends React.Component<any, any> {
  public render() {
    const { index, connectDragSource, connectDropTarget } = this.props;
    return connectDragSource(connectDropTarget(
      <div key={index}>
        {this.props.children}
      </div>,
    ));
  }
}

export const DraggableDroppableTargetSource = (dropTargetType: string, dragTargetType: string) => DropTarget(
  dropTargetType,
  draggableDroppableTarget,
  (connect: DropTargetConnector) => ({
    connectDropTarget: connect.dropTarget(),
  }),
)(
  DragSource(
    dragTargetType,
    draggableDroppableSource,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    }),
  )(DraggableDroppable),
);
