import { createContext } from 'react';

export type StudioDragAndDropTreeItemContextProps = {
  nodeId?: string;
};

export const StudioDragAndDropTreeItemContext =
  createContext<StudioDragAndDropTreeItemContextProps>({});
