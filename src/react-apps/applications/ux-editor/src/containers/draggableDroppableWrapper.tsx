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
    }
  }
}

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
}

class DraggableDroppable extends React.Component<any, any> {
  public render() {
    const { connectDragSource, connectDropTarget } = this.props;
    return connectDragSource(connectDropTarget(
      <div>
        {this.props.children}
      </div>,
    ));
  }
}

const DraggableDroppableTargetSource = DropTarget(
  'item',
  draggableDroppableTarget,
  (connect: DropTargetConnector) => ({
    connectDropTarget: connect.dropTarget(),
  }),
)(
  DragSource(
    'item',
    draggableDroppableSource,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    }),
  )(DraggableDroppable),
);

export class DraggableDroppableWrapper extends React.Component<any, any> {
  public updateIndex = (dragIndex: number, hoverIndex: number) => {
    this.props.updateOrder(dragIndex, hoverIndex);
  }

  public onDrop = (props: any) => {
    if (!props.draggedData || !props.draggedData.actionMethod) {
      return;
    }
    props.draggedData.actionMethod(0, this.props.id);
  }

  public render() {
    return (
      <DraggableDroppableTargetSource onDrop={this.onDrop} updateIndex={this.updateIndex}>
        {this.props.children}
      </DraggableDroppableTargetSource>
    )
  }
}
