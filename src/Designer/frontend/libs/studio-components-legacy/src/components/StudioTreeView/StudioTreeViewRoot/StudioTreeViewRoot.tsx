import type { HTMLAttributes } from 'react';
import React, { useEffect, useId, useLayoutEffect, useState } from 'react';
import { StudioTreeViewRootContext } from './';
import classes from './StudioTreeViewRoot.module.css';
import { findFirstNodeId } from '../utils/domUtils';
import { focusableNodeId } from '../utils/treeViewItemUtils';
import cn from 'classnames';

export type StudioTreeViewRootProps = {
  onSelect?: (nodeId: string) => void;
  selectedId?: string;
} & Omit<HTMLAttributes<HTMLUListElement>, 'onSelect'>;

export const StudioTreeViewRoot = ({
  children,
  className,
  onSelect,
  selectedId: selectedIdFromProps,
  ...rest
}: StudioTreeViewRootProps) => {
  const rootId = useId();
  const [focusedId, setFocusedId] = useState<string | undefined>(undefined);
  const [focusableId, setFocusableId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(selectedIdFromProps);
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
    <StudioTreeViewRootContext.Provider
      value={{
        focusedId,
        rootId,
        setFocusedId,
        focusableId,
        selectedId,
        setSelectedId: handleSelect,
      }}
    >
      <ul role='tree' {...rest} id={rootId} className={cn(classes.list, className)}>
        {children}
      </ul>
    </StudioTreeViewRootContext.Provider>
  );
};
