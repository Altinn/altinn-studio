import React, { ReactNode, useEffect, useId, useLayoutEffect, useState } from 'react';
import { TreeViewRootContext } from '../TreeViewRoot';
import classes from './TreeViewRoot.module.css';
import { findFirstNodeId } from 'app-shared/components/TreeView/utils/domUtils';
import { focusableNodeId } from 'app-shared/components/TreeView/utils/treeViewItemUtils';

export interface TreeViewRootProps {
  children: ReactNode;
  onSelect?: (nodeId: string) => void;
  selectedId?: string;
}

export const TreeViewRoot = ({
  children,
  onSelect,
  selectedId: selectedIdFromProps,
}: TreeViewRootProps) => {
  const rootId = useId();
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedIdFromProps);
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const [focusableId, setFocusableId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(selectedIdFromProps);
  }, [selectedIdFromProps]);

  useLayoutEffect(() => {
    const firstNodeId = findFirstNodeId(rootId);
    setFocusableId(focusableNodeId(focusedId, selectedId, firstNodeId));
  }, [rootId, selectedId, focusedId]);

  const handleSelect = (nodeId: string) => {
    setSelectedId(nodeId);
    onSelect?.(nodeId);
  };

  return (
    <TreeViewRootContext.Provider
      value={{
        focusedId,
        rootId,
        selectedId,
        setFocusedId,
        setSelectedId: handleSelect,
        focusableId,
      }}
    >
      <ul role='tree' id={rootId} className={classes.list}>
        {children}
      </ul>
    </TreeViewRootContext.Provider>
  );
};
