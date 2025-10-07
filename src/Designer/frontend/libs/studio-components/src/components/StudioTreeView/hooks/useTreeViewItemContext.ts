import { useContext } from 'react';
import { StudioTreeViewItemContext } from '../StudioTreeViewItem';
import type { TreeViewItemContextProps } from '../StudioTreeViewItem';

export const useTreeViewItemContext = (): TreeViewItemContextProps =>
  useContext(StudioTreeViewItemContext);
