import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { isDirectChildOfNode } from '../utils/domUtils';

export const useTreeViewItemOpenOnHierarchySelect = (
  rootId: string,
  nodeId: string,
  selectedId: string,
  uniqueNodeId: string,
  selectedUniqueId: string,
  setOpen: Dispatch<SetStateAction<boolean>>,
) => {
  useEffect(() => {
    if (uniqueNodeId === selectedUniqueId) {
      setOpen(true);
    } else if (isDirectChildOfNode(selectedUniqueId, rootId, uniqueNodeId)) {
      setOpen(true);
    }
  }, [nodeId, rootId, selectedId, setOpen, selectedUniqueId, uniqueNodeId]);
};
