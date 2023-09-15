import {
  DraggableEditorItemType,
  DragCursorPosition,
  DndItem,
  ExistingDndItem,
  HandleDrop,
} from '../../../types/dndTypes';
import React, { ReactNode, useMemo, useRef, useState } from 'react';
import { ConnectDragSource, useDrag, useDrop } from 'react-dnd';
import { calculateNewPosition, getDragCursorPosition } from '../../../utils/dndUtils';
import classes from './DragAndDropListItem.module.css';
import { useIsParentDisabled } from '../hooks/useIsParentDisabled';
import { DragAndDropListItemContext } from '../DragAndDropListItem';
import { useParentId } from '../hooks/useParentId';

export interface DragAndDropListItemProps<T> {
  /** The index of the item. */
  index: number;

  /** The id of the item. */
  itemId: string;

  /** Action to be called when another item is dropped over the item. */
  onDrop: HandleDrop<T>;

  /** Function that renders the item content. It takes a drag handle ref as a parameter - this must be used as the ref to the drag handle component. */
  renderItem: (dragHandleRef: ConnectDragSource) => ReactNode;
}

interface DragCollectedProps {
  isDragging: boolean;
}

export function DragAndDropListItem<T>({
  index,
  itemId,
  onDrop,
  renderItem,
}: DragAndDropListItemProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragCursorPosition, setDragCursorPosition] = useState<DragCursorPosition>(
    DragCursorPosition.Outside
  );
  const isParentDisabled = useIsParentDisabled();
  const parentId = useParentId();

  const boxShadow = useMemo(() => {
    switch (dragCursorPosition) {
      case DragCursorPosition.UpperHalf:
      case DragCursorPosition.LowerHalf:
        const minus = dragCursorPosition === DragCursorPosition.UpperHalf ? '-1 * ' : '';
        return `0 calc(${minus}var(--list-item-gap)) var(--list-item-gap-hover-color)`;
      default:
        return undefined;
    }
  }, [dragCursorPosition]);

  const item: ExistingDndItem = useMemo(
    () => ({
      isNew: false,
      id: itemId,
      position: { index, parentId },
    }),
    [index, itemId, parentId]
  );

  const [{ isDragging }, drag, dragPreview] = useDrag<DndItem<T>, unknown, DragCollectedProps>({
    type: DraggableEditorItemType.ExistingItem,
    item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DndItem<T>, unknown, void>({
    accept: Object.values(DraggableEditorItemType),
    drop: (draggedItem) => {
      const position = calculateNewPosition<T>(draggedItem, item, dragCursorPosition);
      if (position) onDrop(draggedItem, position);
      setDragCursorPosition(DragCursorPosition.Idle);
    },
    hover: (draggedItem, monitor) => {
      // Check if the cursor is in the upper or lower half of the item, and update the state accordingly if necessary
      const currentDragPosition = getDragCursorPosition<T>(
        monitor,
        draggedItem,
        item,
        wrapperRef,
        isParentDisabled
      );
      if (currentDragPosition !== dragCursorPosition) setDragCursorPosition(currentDragPosition);
    },
    collect: (monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        setDragCursorPosition(DragCursorPosition.Outside);
      }
    },
  });

  const opacity = isDragging ? 0.25 : 1;

  return (
    <div ref={wrapperRef}>
      <div ref={drop} className={classes.wrapper}>
        <div ref={dragPreview} style={{ opacity, boxShadow }}>
          <DragAndDropListItemContext.Provider
            value={{ isDisabled: isDragging || isParentDisabled, itemId }}
          >
            {renderItem(drag)}
          </DragAndDropListItemContext.Provider>
        </div>
      </div>
    </div>
  );
}
