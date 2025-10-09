import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { StudioTreeView } from '../../StudioTreeView';
import { StudioDragAndDrop } from '../../StudioDragAndDrop';
import { StudioDragAndDropTreeRootContext } from './StudioDragAndDropTreeRootContext';
import { StudioEmptyList } from '../StudioEmptyList';

export interface StudioDragAndDropTreeRootProps {
  children?: ReactNode;
  emptyMessage?: string;
  onSelect?: (nodeId: string) => void;
  selectedId?: string;
}

export const StudioDragAndDropTreeRoot = ({
  children,
  emptyMessage,
  onSelect,
  selectedId,
}: StudioDragAndDropTreeRootProps): React.JSX.Element => {
  const [hoveredNodeParent, setHoveredNodeParent] = useState<string | undefined>(undefined);

  return (
    <StudioDragAndDropTreeRootContext.Provider value={{ hoveredNodeParent, setHoveredNodeParent }}>
      <StudioDragAndDrop.List>
        <StudioTreeView.Root
          onSelect={onSelect}
          onMouseOut={() => setHoveredNodeParent(undefined)}
          selectedId={selectedId}
        >
          {children || <StudioEmptyList>{emptyMessage}</StudioEmptyList>}
        </StudioTreeView.Root>
      </StudioDragAndDrop.List>
    </StudioDragAndDropTreeRootContext.Provider>
  );
};
