import React, { ReactNode, useCallback } from 'react';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { DraggableEditorItemType, DndItem, HandleDrop } from '../../types/dndTypes';
import classes from './DroppableList.module.css';

export interface DroppableListProps {
  children: ReactNode;
  containerId: string;
  disabledDrop?: boolean;
  handleDrop: HandleDrop;
}

export interface DroppableListCollectedProps {
  canBeDropped: boolean;
}

export const DroppableList = ({
  children,
  containerId,
  disabledDrop,
  handleDrop,
}: DroppableListProps) => {
  const canDrop = useCallback(
    (monitor: DropTargetMonitor) => monitor.isOver({ shallow: true }) && !disabledDrop,
    [disabledDrop],
  );
  const [{ canBeDropped }, drop] = useDrop<DndItem, unknown, DroppableListCollectedProps>({
    accept: Object.values(DraggableEditorItemType),
    drop: (draggedItem, monitor) => {
      if (canDrop(monitor)) {
        handleDrop(draggedItem, { parentId: containerId, index: -1 });
      }
    },
    collect: (monitor) => ({
      canBeDropped: canDrop(monitor),
    }),
  });
  const backgroundColor = canBeDropped ? 'var(--list-empty-space-hover-color)' : 'transparent';
  return <div ref={drop} style={{ backgroundColor }} className={classes.root}>{children}</div>;
}
