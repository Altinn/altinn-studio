import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';
import { findAllNodeIds, findParentId } from '../utils/domUtils';

export const useTreeViewItemOpenOnHierarchySelect = (
  rootId: string,
  nodeId: string,
  selectedId: string,
  parentId: string | undefined,
  selectedParentId: string | undefined,
  setOpen: Dispatch<SetStateAction<boolean>>,
) => {
  useEffect(() => {
    const matchingParent = Boolean(parentId) && parentId === selectedParentId;
    const matchingNode = nodeId === selectedId;
    const allNodeIds = findAllNodeIds(rootId);
    const uniqueNodeId = allNodeIds.filter((id) => id === selectedId).length === 1;

    if (
      (matchingParent && matchingNode) ||
      (!parentId && matchingNode) ||
      selectedParentId === nodeId
    )
      setOpen(true);
    // else if (isDirectChildOfNode(selectedId, rootId, nodeId)) setOpen(true);
  }, [nodeId, rootId, selectedId, setOpen, parentId, selectedParentId]);
};
