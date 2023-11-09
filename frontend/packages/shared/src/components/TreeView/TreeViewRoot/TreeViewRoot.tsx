import React, {
  forwardRef,
  HTMLAttributes,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useState,
} from 'react';
import { TreeViewRootContext } from '../TreeViewRoot';
import classes from './TreeViewRoot.module.css';
import { findFirstNodeId, hasItems } from 'app-shared/components/TreeView/utils/domUtils';
import { focusableNodeId } from 'app-shared/components/TreeView/utils/treeViewItemUtils';
import cn from 'classnames';

export type TreeViewRootProps = {
  onSelect?: (nodeId: string) => void;
  selectedId?: string;
} & Omit<HTMLAttributes<HTMLUListElement>, 'onSelect'>;

export type TreeViewRootRef = {
  hasItems: () => boolean;
};

export const TreeViewRoot = forwardRef<TreeViewRootRef, TreeViewRootProps>(
  ({ children, className, onSelect, selectedId: selectedIdFromProps, ...rest }, ref) => {
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

    useImperativeHandle(ref, () => ({
      hasItems: () => hasItems(rootId),
    }));

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
        <ul role='tree' {...rest} id={rootId} className={cn(classes.list, className)}>
          {children}
        </ul>
      </TreeViewRootContext.Provider>
    );
  },
);

TreeViewRoot.displayName = 'TreeViewRoot';
