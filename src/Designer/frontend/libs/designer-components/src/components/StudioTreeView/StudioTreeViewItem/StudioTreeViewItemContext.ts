import { createContext } from 'react';

export interface TreeViewItemContextProps {
  level: number;
}

export const StudioTreeViewItemContext = createContext<TreeViewItemContextProps>({
  level: 1,
});
