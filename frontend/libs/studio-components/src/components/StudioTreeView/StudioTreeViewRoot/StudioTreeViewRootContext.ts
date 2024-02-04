import { createContext } from 'react';

export interface TreeViewRootContextProps {
  focusableId: string | null;
  focusedId?: string;
  rootId: string;
  selectedId?: string;
  setFocusedId: (id?: string) => void;
  setSelectedId: (id?: string) => void;
}

export const StudioTreeViewRootContext = createContext<TreeViewRootContextProps>(null);
