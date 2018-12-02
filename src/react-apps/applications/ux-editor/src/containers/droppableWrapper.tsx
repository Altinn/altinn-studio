import * as React from 'react';
import { DropTarget, DropTargetConnector, DropTargetMonitor } from 'react-dnd';

interface IDroppableWrapperProps {
  connectDropTarget: (...args: any) => any;
  isOver: boolean;
}

export const droppableWrapper = (type: string, droppableData: any, component: any) => {
  class DroppableComponent extends React.Component<IDroppableWrapperProps, any> {
    public render(): any {
      return this.props.connectDropTarget(
        <div>
          Drop things here
          {component}
        </div>,
      );
    }
  }

  return DropTarget(type, droppableData, (connect: DropTargetConnector, monitor: DropTargetMonitor) => ({
    connectDragTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
  }))(DroppableComponent);
};
