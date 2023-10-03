import React, { ReactNode, useCallback } from 'react';
import { DropTargetMonitor, useDrop } from 'react-dnd';
import { DraggableEditorItemType, DndItem } from 'app-shared/types/dndTypes';
import classes from './DragAndDropList.module.css';
import * as testids from '../../../../../../testing/testids';
import { useIsParentDisabled } from '../hooks/useIsParentDisabled';
import { useParentId } from '../hooks/useParentId';
import { useOnDrop } from 'app-shared/components/dragAndDrop/hooks/useOnDrop';
import { useDomSelectors } from 'app-shared/components/dragAndDrop/hooks/useDomSelectors';

export interface DragAndDropListProps {
  /** The list of existing items. */
  children: ReactNode;
}

export interface DragAndDropListCollectedProps {
  canBeDropped: boolean;
}

export function DragAndDropList<T>({ children }: DragAndDropListProps) {
  const disabledDrop = useIsParentDisabled();
  const parentId = useParentId();
  const domSelectors = useDomSelectors(parentId);
  const onDrop = useOnDrop<T>();
  const canDrop = useCallback(
    (monitor: DropTargetMonitor) => monitor.isOver({ shallow: true }) && !disabledDrop,
    [disabledDrop],
  );
  const [{ canBeDropped }, drop] = useDrop<DndItem<T>, unknown, DragAndDropListCollectedProps>({
    accept: Object.values(DraggableEditorItemType),
    drop: (draggedItem, monitor) => {
      if (canDrop(monitor)) {
        onDrop(draggedItem, { parentId, index: -1 });
      }
    },
    collect: (monitor) => ({
      canBeDropped: canDrop(monitor),
    }),
  });
  const backgroundColor = canBeDropped ? 'var(--list-empty-space-hover-color)' : 'transparent';
  return (
    <div
      className={classes.root + ' ' + domSelectors.list.className}
      data-testid={testids.droppableList}
      id={domSelectors.list.id}
      ref={drop}
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
}
