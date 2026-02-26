import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';

export type StudioDragAndDropTreeRootContextProps = {
  hoveredNodeParent?: string | null;
  setHoveredNodeParent?: Dispatch<SetStateAction<string | undefined>>;
};

export const StudioDragAndDropTreeRootContext =
  createContext<StudioDragAndDropTreeRootContextProps>({});
