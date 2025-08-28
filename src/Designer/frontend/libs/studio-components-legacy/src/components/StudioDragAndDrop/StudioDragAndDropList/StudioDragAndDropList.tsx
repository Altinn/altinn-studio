import type { HTMLAttributes, ReactElement } from 'react';
import React, { useCallback } from 'react';
import type { DropTargetMonitor } from 'react-dnd';
import { useDrop } from 'react-dnd';
import type { DndItem } from '../types';
import { DraggableEditorItemType } from '../types';
import classes from './StudioDragAndDropList.module.css';
import { useIsParentDisabled } from '../hooks/useIsParentDisabled';
import { useParentId } from '../hooks/useParentId';
import { useOnDrop } from '../hooks/useOnDrop';
import { useDomSelectors } from '../hooks/useDomSelectors';
import { droppableListId } from '../testUtils/dataTestIds';

export type StudioDragAndDropListProps = HTMLAttributes<HTMLDivElement>;

export interface StudioDragAndDropListCollectedProps {
  canBeDropped: boolean;
}

export function StudioDragAndDropList<T>({ children }: StudioDragAndDropListProps): ReactElement {
  const disabledDrop = useIsParentDisabled();
  const parentId = useParentId();
  const domSelectors = useDomSelectors(parentId);
  const onDrop = useOnDrop<T>();
  const canDrop = useCallback(
    (monitor: DropTargetMonitor) => monitor.isOver({ shallow: true }) && !disabledDrop,
    [disabledDrop],
  );
  const [{ canBeDropped }, drop] = useDrop<
    DndItem<T>,
    unknown,
    StudioDragAndDropListCollectedProps
  >({
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
      data-testid={droppableListId}
      id={domSelectors.list.id}
      ref={drop}
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
}
