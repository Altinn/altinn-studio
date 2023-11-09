import React, { ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { TreeView, TreeViewRootRef } from 'app-shared/components/TreeView';
import { DragAndDropTreeRootContext } from './DragAndDropTreeRootContext';
import { EmptyList } from 'app-shared/components/DragAndDropTree/EmptyList';

export interface DragAndDropTreeRootProps {
  children?: ReactNode;
  emptyMessage?: string;
  onSelect?: (nodeId: string) => void;
}

export const DragAndDropTreeRoot = ({
  children,
  emptyMessage,
  onSelect,
}: DragAndDropTreeRootProps) => {
  const [hoveredNodeParent, setHoveredNodeParent] = useState<string | null>(null);
  const listRef = useRef<TreeViewRootRef>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  useLayoutEffect(() => {
    setIsEmpty(!listRef.current.hasItems());
  });

  return (
    <DragAndDropTreeRootContext.Provider value={{ hoveredNodeParent, setHoveredNodeParent }}>
      <DragAndDrop.List>
        <TreeView.Root
          onSelect={onSelect}
          onMouseOut={() => setHoveredNodeParent(null)}
          ref={listRef}
        >
          {children}
          {isEmpty && <EmptyList>{emptyMessage}</EmptyList>}
        </TreeView.Root>
      </DragAndDrop.List>
    </DragAndDropTreeRootContext.Provider>
  );
};
