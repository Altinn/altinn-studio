import React, { ElementType, KeyboardEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { useTreeViewRootContext } from '../hooks/useTreeViewRootContext';
import { useTreeViewItemContext } from '../hooks/useTreeViewItemContext';
import {
  findFirstChildId,
  findFirstNodeId,
  findLastVisibleNodeId,
  findNextVisibleNodeId,
  findParentId,
  findPreviousVisibleNodeId,
  makeDomGroupId,
  makeDomTreeItemId,
} from '../utils/domUtils';
import { AnimateHeight } from 'app-shared/components/AnimateHeight';
import { TreeViewItemContext } from './TreeViewItemContext';
import { ChevronDownIcon, ChevronRightIcon } from '@navikt/aksel-icons';
import { Button } from '@digdir/design-system-react';
import classes from './TreeViewItem.module.css';

export interface TreeViewItemProps {
  as?: ElementType;
  children?: ReactNode;
  label: ReactNode;
  labelWrapper?: (children: ReactNode) => ReactNode;
  nodeId: string;
}

export const TreeViewItem = ({
  as = 'li',
  children,
  label,
  labelWrapper = (lab) => lab,
  nodeId,
}: TreeViewItemProps) => {
  const [open, setOpen] = useState(false);
  const { selectedId, setSelectedId, rootId, focusedId, setFocusedId, focusableId } =
    useTreeViewRootContext();
  const { level } = useTreeViewItemContext();
  const treeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusedId === nodeId) {
      treeItemRef.current?.focus();
    }
  }, [focusedId, nodeId]);

  const selected = selectedId === nodeId;
  const focusable = focusableId === nodeId;

  const handleClick = () => {
    setOpen((prevOpen) => !prevOpen);
    setSelectedId(nodeId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowRight': // Open node if closed, focus on first child if open, do nothing if not expandable
        if (children) {
          open ? setFocusedId(findFirstChildId(rootId, nodeId)) : setOpen(true);
        }
        break;
      case 'ArrowLeft': // Close node if open, focus on parent otherwise
        open ? setOpen(false) : setFocusedId(findParentId(rootId, nodeId));
        break;
      case 'ArrowDown': // Focus on next visible node
        const nextVisibleNode = findNextVisibleNodeId(rootId, nodeId);
        if (nextVisibleNode) setFocusedId(nextVisibleNode);
        break;
      case 'ArrowUp': // Focus on previous visible node
        const previousVisibleNode = findPreviousVisibleNodeId(rootId, nodeId);
        if (previousVisibleNode) setFocusedId(previousVisibleNode);
        break;
      case 'Home': // Focus on first node
        setFocusedId(findFirstNodeId(rootId));
        break;
      case 'End': // Focus on last visible node
        setFocusedId(findLastVisibleNodeId(rootId));
        break;
    }
  };

  const handleFocus = () => setFocusedId(nodeId);

  const treeItemId = makeDomTreeItemId(rootId, nodeId);
  const listId = makeDomGroupId(rootId, nodeId);

  const renderLabel = () => (
    <Button
      aria-expanded={children ? open : undefined}
      aria-level={level}
      aria-owns={listId}
      aria-selected={selected}
      className={classes.button}
      id={treeItemId}
      onClick={handleClick}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      ref={treeItemRef}
      role='treeitem'
      size='small'
      tabIndex={focusable ? 0 : -1}
      type='button'
      variant='quiet'
    >
      <span aria-hidden className={classes.chevronWrapper}>
        {children && (open ? <ChevronDownIcon /> : <ChevronRightIcon />)}
      </span>
      {label}
    </Button>
  );

  const Component = as;

  return (
    <TreeViewItemContext.Provider value={{ level: level + 1 }}>
      <Component role='none' className={classes.listItem}>
        {labelWrapper(renderLabel())}
        {children && (
          <AnimateHeight open={open}>
            <ul role='group' id={listId} aria-hidden={!open}>
              {children}
            </ul>
          </AnimateHeight>
        )}
      </Component>
    </TreeViewItemContext.Provider>
  );
};
