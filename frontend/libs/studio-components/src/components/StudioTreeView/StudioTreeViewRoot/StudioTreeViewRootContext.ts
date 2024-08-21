import { createContext } from 'react';

export interface TreeViewRootContextProps {
  focusableId: string | null;
  focusedId?: string;
  rootId: string;
  setFocusedId: (id?: string) => void;
  selectedUniqueId?: string;
  setSelectedUniqueId: (id?: string) => void;
}

export const StudioTreeViewRootContext = createContext<TreeViewRootContextProps>(null);
