import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DndItem, ExistingDndItem } from '../types';
import { DragCursorPosition, DraggableEditorItemType } from '../types';
import type { CSSProperties, ElementType, ReactElement, ReactNode } from 'react';
import type { ConnectDragSource } from 'react-dnd';
import { useDrag, useDrop } from 'react-dnd';
import { calculateNewPosition, getDragCursorPosition } from '../utils/dndUtils';
import classes from './StudioDragAndDropListItem.module.css';
import { useIsParentDisabled } from '../hooks/useIsParentDisabled';
import { StudioDragAndDropListItemContext } from './index';
import { useParentId } from '../hooks/useParentId';
import { useOnDrop } from '../hooks/useOnDrop';
import { useDomSelectors } from '../hooks/useDomSelectors';
import { findPositionInList } from '../utils/domUtils';
import { useGapValue } from '../hooks/useGapValue';

export type StudioDragAndDropListItemProps = {
  /** The type of the HTML item to render as the root. */
  as?: ElementType;

  /** The id of the item. */
  itemId: string;

  /** Function that is called when something is being dragged over the item. */
  onDragOver?: () => void;

  /** Function that renders the item content. It takes a drag handle ref as a parameter - this must be used as the ref to the drag handle component. */
  renderItem: (dragHandleRef: ConnectDragSource) => ReactNode;
};

interface DragCollectedProps {
  isDragging: boolean;
}

type WrapperStyle = CSSProperties & {
  '--list-item-gap': string;
};

export function StudioDragAndDropListItem<T>({
  as = 'div',
  itemId,
  onDragOver,
  renderItem,
}: StudioDragAndDropListItemProps): ReactElement {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [dragCursorPosition, setDragCursorPosition] = useState<DragCursorPosition>(
    DragCursorPosition.Outside,
  );
  const isParentDisabled = useIsParentDisabled();
  const parentId = useParentId();
  const onDrop = useOnDrop<T>();
  const domSelectors = useDomSelectors(itemId);
  const gap = useGapValue();

  const isBeingDraggedOver = [
    DragCursorPosition.UpperHalf,
    DragCursorPosition.LowerHalf,
    DragCursorPosition.Self,
  ].includes(dragCursorPosition);

  useEffect(() => {
    if (isBeingDraggedOver) onDragOver?.();
  }, [isBeingDraggedOver, onDragOver]);

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

  const item: () => ExistingDndItem = useCallback(
    () => ({
      isNew: false,
      id: itemId,
      position: { index: findPositionInList(domSelectors.baseId, itemId), parentId },
    }),
    [itemId, parentId, domSelectors.baseId],
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
      const position = calculateNewPosition<T>(draggedItem, item(), dragCursorPosition);
      if (position) onDrop(draggedItem, position);
      setDragCursorPosition(DragCursorPosition.Idle);
    },
    hover: (draggedItem, monitor) => {
      // Check if the cursor is in the upper or lower half of the item, and update the state accordingly if necessary
      const currentDragPosition = getDragCursorPosition<T>(
        monitor,
        draggedItem,
        item(),
        wrapperRef,
        isParentDisabled,
      );
      setDragCursorPosition(currentDragPosition);
    },
    collect: (monitor) => {
      if (!monitor.isOver({ shallow: true })) {
        setDragCursorPosition(DragCursorPosition.Outside);
      }
    },
  });

  const opacity = isDragging ? 0.25 : 1;
  const wrapperStyle: WrapperStyle = {
    '--list-item-gap': gap,
  };
  const Component = as;

  return (
    <Component
      ref={wrapperRef}
      className={classes.root + ' ' + domSelectors.item.className}
      id={domSelectors.item.id}
    >
      <div ref={drop} style={wrapperStyle} className={classes.wrapper}>
        <div ref={dragPreview} style={{ opacity, boxShadow }}>
          <StudioDragAndDropListItemContext.Provider
            value={{ isDisabled: isDragging || isParentDisabled, itemId }}
          >
            {renderItem(drag)}
          </StudioDragAndDropListItemContext.Provider>
        </div>
      </div>
    </Component>
  );
}
