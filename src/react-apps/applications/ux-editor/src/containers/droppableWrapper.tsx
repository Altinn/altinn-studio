import * as React from 'react';
import { DropTarget, DropTargetConnector, DropTargetMonitor, ConnectDropTarget } from 'react-dnd';


const ItemTarget = {
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

function collect(connect: DropTargetConnector, monitor: DropTargetMonitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    hovered: monitor.isOver(),
    item: monitor.getItem(),
  }
}

export interface IDroppable {
  connectDropTarget: ConnectDropTarget;
  hovered: boolean;
  item: any;
  id: string;
}

class Droppable extends React.Component<IDroppable, any> {
  render() {
    const { connectDropTarget } = this.props;
    return connectDropTarget(
      <div>
        {this.props.children}
      </div>
    )
  }
}

const DropSource = DropTarget('item', ItemTarget, collect)(Droppable);

export class DroppableWrapper extends React.Component<any, any> {
  onDrop = (props: any) => {
    if (!props.draggedData.actionMethod) {
      console.log('lolol');
      return;
    }
    props.draggedData.actionMethod(0, this.props.id);
  }

  render() {
    return (
      <DropSource onDrop={this.onDrop}>
        {this.props.children}
      </DropSource>
    )
  }
}
