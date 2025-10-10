import { StudioTreeViewRootContext } from '../StudioTreeViewRoot';
import type { TreeViewRootContextProps } from '../StudioTreeViewRoot';
import { useContext } from 'react';

export const useTreeViewRootContext = (): TreeViewRootContextProps => {
  const context = useContext(StudioTreeViewRootContext);
  if (!context) {
    throw new Error('useTreeViewRootContext must be used within the TreeViewRoot component.');
  }
  return context;
};
