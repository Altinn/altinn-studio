import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { isDirectChildOfNode } from '../utils/domUtils';

export const useTreeViewItemOpenOnHierarchySelect = (
  rootId: string,
  nodeId: string,
  selectedId: string,
  setOpen: Dispatch<SetStateAction<boolean>>,
) => {
  useEffect(() => {
    if (nodeId === selectedId) {
      setOpen(true);
    } else if (isDirectChildOfNode(selectedId, rootId, nodeId)) {
      setOpen(true);
    }
  }, [rootId, setOpen, selectedId, nodeId]);
};
