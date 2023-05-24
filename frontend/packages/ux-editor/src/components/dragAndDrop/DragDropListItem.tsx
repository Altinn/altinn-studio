import {
  DraggableEditorItemType,
  DragCursorPosition,
  DndItem,
  ExistingDndItem,
  HandleDrop
} from '../../types/dndTypes';
import React, { ReactNode, useMemo, useRef, useState } from 'react';
import { ConnectDragSource, useDrag, useDrop } from 'react-dnd';
import { calculateNewPosition, getDragCursorPosition } from '../../utils/dndUtils';
import classes from './DragDropListItem.module.css';

export interface DragDropListItemProps {
  disabledDrop?: boolean;
  item: ExistingDndItem;
  onDrop: HandleDrop;
  renderItem: (dragHandleRef: ConnectDragSource, isDragging?: boolean) => ReactNode;
  type: DraggableEditorItemType;
}

interface DragCollectedProps {
  isDragging: boolean;
}

export const DragDropListItem = ({
  disabledDrop,
  item,
  onDrop,
  renderItem,
  type,
}: DragDropListItemProps) => {

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragCursorPosition, setDragCursorPosition] = useState<DragCursorPosition>(DragCursorPosition.Outside);

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

  const [{ isDragging }, drag, dragPreview] = useDrag<DndItem, unknown, DragCollectedProps>({
    type,
    item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DndItem, unknown, void>({
    accept: Object.values(DraggableEditorItemType),
    drop: (draggedItem) => {
      const position = calculateNewPosition(draggedItem, item, dragCursorPosition);
      if (position) onDrop(draggedItem, position);
      setDragCursorPosition(DragCursorPosition.Idle);
    },
    hover: (draggedItem, monitor) => {
      // Check if the cursor is in the upper or lower half of the item, and update the state accordingly if necessary
      const currentDragPosition = getDragCursorPosition(monitor, draggedItem, item, wrapperRef, disabledDrop);
      if (currentDragPosition !== dragCursorPosition) setDragCursorPosition(currentDragPosition);
    },
    collect: (monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        setDragCursorPosition(DragCursorPosition.Outside);
      }
    }
  });

  const opacity = isDragging ? 0.25 : 1;

  return (
    <div ref={wrapperRef}>
      <div ref={drop} className={classes.wrapper}>
        <div ref={dragPreview} style={{ opacity, boxShadow }}>
          {renderItem(drag, isDragging)}
        </div>
      </div>
    </div>
  );
};
