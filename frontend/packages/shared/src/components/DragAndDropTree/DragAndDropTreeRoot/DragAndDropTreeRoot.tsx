import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { StudioTreeView, StudioDragAndDrop } from '@studio/components';
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
      <StudioDragAndDrop.List>
        <StudioTreeView.Root
          onSelect={onSelect}
          onMouseOut={() => setHoveredNodeParent(null)}
          selectedId={selectedId}
        >
          {children || <EmptyList>{emptyMessage}</EmptyList>}
        </StudioTreeView.Root>
      </StudioDragAndDrop.List>
    </DragAndDropTreeRootContext.Provider>
  );
};
