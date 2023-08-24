import React, { ReactNode } from "react";
import { useDrag } from "react-dnd";
import type { NewDndItem } from "../../types/dndTypes";
import { DraggableEditorItemType } from "../../types/dndTypes";
import * as testids from "../../../../../testing/testids";

export interface DraggableToolbarItemProps {
  notDraggable?: boolean;
  children?: ReactNode;
  item: NewDndItem;
}

export const DraggableToolbarItem = ({
  children,
  notDraggable,
  item,
}: DraggableToolbarItemProps) => {
  const [, drag] = useDrag({
    item,
    type: DraggableEditorItemType.ToolbarItem,
    canDrag: () => !notDraggable,
  });
  return (
    <div ref={drag} data-testid={testids.draggableToolbarItem}>
      {children}
    </div>
  );
};
