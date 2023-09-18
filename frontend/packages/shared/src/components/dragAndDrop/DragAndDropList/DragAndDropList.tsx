import React, { ReactNode, useCallback } from 'react';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { DraggableEditorItemType, DndItem, HandleDrop } from 'app-shared/types/dndTypes';
import classes from './DragAndDropList.module.css';
import * as testids from '../../../../../../testing/testids';
import { useIsParentDisabled } from '../hooks/useIsParentDisabled';
import { useParentId } from '../hooks/useParentId';

export interface DragAndDropListProps<T> {
  /** The list of existing items. */
  children: ReactNode;

  /** Action to be called when an item is dropped in the list. */
  handleDrop: HandleDrop<T>;
}

export interface DragAndDropListCollectedProps {
  canBeDropped: boolean;
}

export function DragAndDropList<T>({ children, handleDrop }: DragAndDropListProps<T>) {
  const disabledDrop = useIsParentDisabled();
  const parentId = useParentId();
  const canDrop = useCallback(
    (monitor: DropTargetMonitor) => monitor.isOver({ shallow: true }) && !disabledDrop,
    [disabledDrop]
  );
  const [{ canBeDropped }, drop] = useDrop<DndItem<T>, unknown, DragAndDropListCollectedProps>({
    accept: Object.values(DraggableEditorItemType),
    drop: (draggedItem, monitor) => {
      if (canDrop(monitor)) {
        handleDrop(draggedItem, { parentId, index: -1 });
      }
    },
    collect: (monitor) => ({
      canBeDropped: canDrop(monitor),
    }),
  });
  const backgroundColor = canBeDropped ? 'var(--list-empty-space-hover-color)' : 'transparent';
  return (
    <div
      className={classes.root}
      data-testid={testids.droppableList}
      ref={drop}
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
}
