import { useContext } from 'react';
import { StudioTreeViewItemContext } from '../StudioTreeViewItem';

export const useTreeViewItemContext = () => useContext(StudioTreeViewItemContext);
