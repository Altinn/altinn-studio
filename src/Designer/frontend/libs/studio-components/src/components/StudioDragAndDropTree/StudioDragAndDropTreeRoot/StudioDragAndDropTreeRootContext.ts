import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';

export type StudioDragAndDropTreeRootContextProps = {
  hoveredNodeParent: string | null;
  setHoveredNodeParent: Dispatch<SetStateAction<string | null>>;
};

export const StudioDragAndDropTreeRootContext =
  createContext<StudioDragAndDropTreeRootContextProps>(null);
