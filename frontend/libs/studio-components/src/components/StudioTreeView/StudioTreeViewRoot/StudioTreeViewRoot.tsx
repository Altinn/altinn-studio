import type { HTMLAttributes } from 'react';
import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { StudioTreeViewRootContext } from './';
import classes from './StudioTreeViewRoot.module.css';
import { findFirstNodeId } from '../utils/domUtils';
import { focusableNodeId } from '../utils/treeViewItemUtils';
import cn from 'classnames';

export type StudioTreeViewRootProps = {
  onSelect?: (nodeId: string) => void;
  selectedUniqueId?: string;
} & Omit<HTMLAttributes<HTMLUListElement>, 'onSelect'>;

export const StudioTreeViewRoot = ({
  children,
  className,
  onSelect,
  selectedUniqueId: selectedUniqueIdFromProps,
  ...rest
}: StudioTreeViewRootProps) => {
  const rootId = useId();
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const [focusableId, setFocusableId] = useState<string | null>(null);
  const [selectedUniqueId, setSelectedUniqueId] = useState<string | undefined>(
    selectedUniqueIdFromProps,
  );
  useEffect(() => {
    setSelectedUniqueId(selectedUniqueIdFromProps);
  }, [selectedUniqueIdFromProps]);

  useLayoutEffect(() => {
    const firstNodeId = findFirstNodeId(rootId);
    setFocusableId(focusableNodeId(focusedId, selectedUniqueId, firstNodeId));
  }, [rootId, selectedUniqueId, focusedId]);

  const handleSelect = (uniqueNodeId: string) => {
    setSelectedUniqueId(uniqueNodeId);
    onSelect?.(uniqueNodeId);
  };

  return (
    <StudioTreeViewRootContext.Provider
      value={{
        focusedId,
        rootId,
        setFocusedId,
        focusableId,
        selectedUniqueId,
        setSelectedUniqueId: handleSelect,
      }}
    >
      <ul role='tree' {...rest} id={rootId} className={cn(classes.list, className)}>
        {children}
      </ul>
    </StudioTreeViewRootContext.Provider>
  );
};
