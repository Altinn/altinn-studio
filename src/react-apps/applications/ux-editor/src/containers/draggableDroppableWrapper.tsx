import * as React from 'react'
import { findDOMNode } from 'react-dom'
import {
  DragSource,
  DropTarget,
  DropTargetMonitor,
  DropTargetConnector,
  DragSourceConnector,
  DragSourceMonitor,
} from 'react-dnd';
import { XYCoord } from 'dnd-core';

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

    console.log('Hover');

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
      return
    }


    props.updateIndex(dragIndex, hoverIndex);

    monitor.getItem().index = hoverIndex;
  },
  drop(props: any, monitor: DropTargetMonitor) {
    props.onDrop(monitor.getItem());
  },
}

class DraggableDroppable extends React.Component<any, any> {
  render() {
    const { connectDragSource, connectDropTarget } = this.props;
    return connectDragSource(connectDropTarget(
      <div>
        {this.props.children}
      </div>
    ))
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
  updateIndex = (dragIndex: number, hoverIndex: number) => {
    console.log(dragIndex, hoverIndex);
  }


  onDrop = (props: any) => {
    if (!props.draggedData || !props.draggedData.actionMethod) {
      console.log('lolol', props);
      return;
    }
    props.draggedData.actionMethod(0, this.props.id);
  }

  render() {
    return (
      <DraggableDroppableTargetSource onDrop={this.onDrop} updateIndex={this.updateIndex}>
        {this.props.children}
      </DraggableDroppableTargetSource>
    )
  }
}