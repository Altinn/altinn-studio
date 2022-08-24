import { Identifier } from 'dnd-core';
import React from 'react';
import {
  ConnectDragSource,
  DragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DragSourceSpec,
} from 'react-dnd';

export interface IDraggableProps {
  id: string;
  index?: number;
  containerId: string;
  notDraggable?: boolean;
  onDrop?: (...args: any) => void;
}

interface Collected {
  isDragging: boolean;
  connectDragSource: ConnectDragSource;
}

const Draggable: React.FC<IDraggableProps & Collected> = ({
  connectDragSource,
  children,
  onDrop,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    event.key === 'Enter' ? onDrop() : undefined;

  return connectDragSource(
    <div tabIndex={0} onKeyDown={handleKeyDown}>
      {children}
    </div>,
  );
};

export default (
  type: string | string[],
  draggableSpec: DragSourceSpec<IDraggableProps, any>,
) =>
  DragSource(
    type as Identifier,
    draggableSpec,
    (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging(),
    }),
  )(Draggable);
