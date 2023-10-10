import { createContext, Dispatch, SetStateAction } from 'react';

export type DragAndDropTreeRootContextProps = {
  hoveredNodeParent: string | null;
  setHoveredNodeParent: Dispatch<SetStateAction<string | null>>;
};

export const DragAndDropTreeRootContext = createContext<DragAndDropTreeRootContextProps>(null);
