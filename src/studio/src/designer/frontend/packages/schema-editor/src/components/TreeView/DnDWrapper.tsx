import React, { PropsWithChildren, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { DragItem, dragSourceSpec, dropTargetSpec } from './dnd-helpers';

interface Props {
  onMove: (from: DragItem, to: DragItem) => void;
}
export const DndItem = ({ children, itemId, containerId, index, onMove }: Props & PropsWithChildren & DragItem) => {
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
