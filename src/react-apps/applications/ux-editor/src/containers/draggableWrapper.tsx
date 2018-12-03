/*tslint:disable:max-classes-per-file*/
import * as React from 'react';
import {
  DragSource,
  DragSourceCollector,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
} from 'react-dnd';

const spec: DragSourceSpec<any, any> = {
  beginDrag: (props: any) => {
    return { ...props };
  },
};

const collect: DragSourceCollector<any> = (connect: DragSourceConnector, monitor: DragSourceMonitor): any => {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging(),
  }
};

class Draggable extends React.Component<any, any> {
  public render() {
    const { connectDragSource } = this.props;
    return connectDragSource(
      <div>
        {this.props.children}
      </div>,
    );
  }
}

const DraggableSource = DragSource('item', spec, collect)(Draggable);

export class DraggableWrapper extends React.Component<any, any> {
  public render() {
    return (
      <DraggableSource draggedData={this.props.data} index={this.props.index}>
        {this.props.children}
      </DraggableSource>
    )
  }
}
