import { createContext } from 'react';

export type DragAndDropTreeItemContextProps = {
  nodeId: string;
};

export const DragAndDropTreeItemContext = createContext<DragAndDropTreeItemContextProps>({
  nodeId: null,
});
