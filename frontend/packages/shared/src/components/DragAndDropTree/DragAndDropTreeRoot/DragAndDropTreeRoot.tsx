import React, { ReactNode, useState } from 'react';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { TreeView } from 'app-shared/components/TreeView';
import { DragAndDropTreeRootContext } from './DragAndDropTreeRootContext';

export interface DragAndDropTreeRootProps {
  children?: ReactNode;
}

export const DragAndDropTreeRoot = ({ children }: DragAndDropTreeRootProps) => {
  const [hoveredNodeParent, setHoveredNodeParent] = useState<string | null>(null);
  return (
    <DragAndDropTreeRootContext.Provider value={{ hoveredNodeParent, setHoveredNodeParent }}>
      <DragAndDrop.List>
        <TreeView.Root onMouseOut={() => setHoveredNodeParent(null)}>{children}</TreeView.Root>
      </DragAndDrop.List>
    </DragAndDropTreeRootContext.Provider>
  );
};
