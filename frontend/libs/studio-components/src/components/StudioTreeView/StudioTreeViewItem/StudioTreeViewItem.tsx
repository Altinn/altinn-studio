import type { ElementType, HTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import React, { useEffect, useRef, useState } from 'react';
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
import { StudioAnimateHeight } from '../../StudioAnimateHeight';
import { StudioTreeViewItemContext } from './StudioTreeViewItemContext';
import { ChevronDownIcon, ChevronRightIcon } from '@studio/icons';
import { StudioButton } from '../../StudioButton';
import classes from './StudioTreeViewItem.module.css';
import cn from 'classnames';
import { useTreeViewItemOpenOnHierarchySelect } from '../hooks/useTreeViewItemOpenOnHierarchySelect';

export type StudioTreeViewItemProps = {
  as?: ElementType;
  children?: ReactNode;
  className?: string;
  icon?: ReactNode;
  label: ReactNode;
  labelWrapper?: (children: ReactNode) => ReactNode;
  nodeId: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioTreeViewItem = ({
  as = 'li',
  className,
  children,
  icon,
  label,
  labelWrapper = (lab) => lab,
  nodeId,
  ...rest
}: StudioTreeViewItemProps) => {
  const [open, setOpen] = useState(false);
  const { selectedId, setSelectedId, rootId, focusedId, setFocusedId, focusableId } =
    useTreeViewRootContext();
  const { level } = useTreeViewItemContext();
  const treeItemRef = useRef<HTMLDivElement>(null);
  useTreeViewItemOpenOnHierarchySelect(rootId, nodeId, selectedId, setOpen);

  useEffect(() => {
    if (focusedId === nodeId) {
      treeItemRef.current?.focus();
    }
  }, [focusedId, nodeId]);

  const selected = selectedId === nodeId;
  const focusable = focusableId === nodeId;

  const selectNode = () => {
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
      case 'Enter': // Select node
        selectNode();
        break;
    }
  };

  const handleFocus = () => setFocusedId(nodeId);

  const treeItemId = makeDomTreeItemId(rootId, nodeId);
  const listId = makeDomGroupId(rootId, nodeId);
  const hasChildren = !!children;

  const renderLabel = () => (
    <StudioButton
      aria-expanded={children ? open : undefined}
      aria-level={level}
      aria-owns={listId}
      aria-selected={selected}
      as='div'
      className={classes.button}
      color='first'
      icon={<Icon customIcon={icon} hasChildren={hasChildren} open={open} />}
      id={treeItemId}
      onClick={selectNode}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      ref={treeItemRef}
      role='treeitem'
      tabIndex={focusable ? 0 : -1}
      type='button'
      variant='tertiary'
    >
      <span className={classes.label}>{label}</span>
    </StudioButton>
  );

  const Component = as;

  return (
    <StudioTreeViewItemContext.Provider value={{ level: level + 1 }}>
      <Component role='none' {...rest} className={cn(classes.listItem, className)}>
        {labelWrapper(renderLabel())}
        {hasChildren && (
          <StudioAnimateHeight open={open}>
            <ul role='group' id={listId} aria-hidden={!open} className={classes.childItemList}>
              {children}
            </ul>
          </StudioAnimateHeight>
        )}
      </Component>
    </StudioTreeViewItemContext.Provider>
  );
};

interface IconProps {
  customIcon: ReactNode;
  hasChildren: boolean;
  open: boolean;
}

const Icon = ({ customIcon, hasChildren, open }: IconProps) => {
  if (customIcon) return customIcon;
  if (!hasChildren) return null;
  return open ? <ChevronDownIcon /> : <ChevronRightIcon />;
};
