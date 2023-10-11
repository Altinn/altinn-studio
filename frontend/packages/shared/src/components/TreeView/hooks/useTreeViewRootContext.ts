import { TreeViewRootContext } from '../TreeViewRoot';
import { useContext } from 'react';

export const useTreeViewRootContext = () => {
  const context = useContext(TreeViewRootContext);
  if (!context) {
    throw new Error('useTreeViewRootContext must be used within the TreeViewRoot component.');
  }
  return context;
};
