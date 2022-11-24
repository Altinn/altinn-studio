import type { PropsWithChildren } from 'react';
import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { DragItem } from './dnd-helpers';
import { dragSourceSpec, dropTargetSpec } from './dnd-helpers';

interface Props {
  onMove: (from: DragItem, to: DragItem) => void;
}
export const DndItem = ({
  children,
  itemId,
  containerId,
  index,
  onMove,
}: Props & PropsWithChildren & DragItem) => {
  const item = { itemId, index, containerId };

  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag(dragSourceSpec(item));
  const [{ handlerId }, drop] = useDrop(dropTargetSpec(item, ref.current, onMove));
  drag(drop(ref));
  const opacity = isDragging ? 0 : 1;
  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId}>
      {children}
    </div>
  );
};
