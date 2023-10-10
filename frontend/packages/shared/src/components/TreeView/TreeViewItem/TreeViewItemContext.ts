import { createContext } from 'react';

export interface TreeViewItemContextProps {
  level: number;
}

export const TreeViewItemContext = createContext<TreeViewItemContextProps>({
  level: 1,
});
