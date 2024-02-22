import React, { useState, type ReactNode } from 'react';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { StudioTreeView } from '@studio/components';
import { DragAndDropTreeRootContext } from './DragAndDropTreeRootContext';
import { EmptyList } from 'app-shared/components/DragAndDropTree/EmptyList';

export interface DragAndDropTreeRootProps {
  children?: ReactNode;
  emptyMessage?: string;
  onSelect?: (nodeId: string) => void;
  selectedId?: string;
}

export const DragAndDropTreeRoot = ({
  children,
  emptyMessage,
  onSelect,
  selectedId,
}: DragAndDropTreeRootProps) => {
  const [hoveredNodeParent, setHoveredNodeParent] = useState<string | null>(null);

  return (
    <DragAndDropTreeRootContext.Provider value={{ hoveredNodeParent, setHoveredNodeParent }}>
      <DragAndDrop.List>
        <StudioTreeView.Root
          onSelect={onSelect}
          onMouseOut={() => setHoveredNodeParent(null)}
          selectedId={selectedId}
        >
          {children || <EmptyList>{emptyMessage}</EmptyList>}
        </StudioTreeView.Root>
      </DragAndDrop.List>
    </DragAndDropTreeRootContext.Provider>
  );
};
