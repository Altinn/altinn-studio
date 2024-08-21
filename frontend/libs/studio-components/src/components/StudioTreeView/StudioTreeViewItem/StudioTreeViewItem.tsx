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
  uniqueNodeId: string;
} & HTMLAttributes<HTMLDivElement>;

export const StudioTreeViewItem = ({
  as = 'li',
  className,
  children,
  icon,
  label,
  labelWrapper = (lab) => lab,
  uniqueNodeId,
  ...rest
}: StudioTreeViewItemProps) => {
  const [open, setOpen] = useState(false);
  const { selectedUniqueId, setSelectedUniqueId, rootId, focusedId, setFocusedId, focusableId } =
    useTreeViewRootContext();
  const { level } = useTreeViewItemContext();
  const treeItemRef = useRef<HTMLDivElement>(null);
  useTreeViewItemOpenOnHierarchySelect(rootId, uniqueNodeId, selectedUniqueId, setOpen);

  useEffect(() => {
    if (focusedId === uniqueNodeId) {
      treeItemRef.current?.focus();
    }
  }, [focusedId, uniqueNodeId]);

  const selected = selectedUniqueId === uniqueNodeId;
  const focusable = focusableId === uniqueNodeId;

  const selectNode = () => {
    setOpen((prevOpen) => !prevOpen);
    setSelectedUniqueId(uniqueNodeId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowRight': // Open node if closed, focus on first child if open, do nothing if not expandable
        if (children) {
          open ? setFocusedId(findFirstChildId(rootId, uniqueNodeId)) : setOpen(true);
        }
        break;
      case 'ArrowLeft': // Close node if open, focus on parent otherwise
        open ? setOpen(false) : setFocusedId(findParentId(rootId, uniqueNodeId));
        break;
      case 'ArrowDown': // Focus on next visible node
        const nextVisibleNode = findNextVisibleNodeId(rootId, uniqueNodeId);
        if (nextVisibleNode) setFocusedId(nextVisibleNode);
        break;
      case 'ArrowUp': // Focus on previous visible node
        const previousVisibleNode = findPreviousVisibleNodeId(rootId, uniqueNodeId);
        if (previousVisibleNode) setFocusedId(previousVisibleNode);
        break;
      case 'Home': // Focus on first node
        setFocusedId(findFirstNodeId(uniqueNodeId));
        break;
      case 'End': // Focus on last visible node
        setFocusedId(findLastVisibleNodeId(uniqueNodeId));
        break;
      case 'Enter': // Select node
        selectNode();
        break;
    }
  };

  const handleFocus = () => setFocusedId(uniqueNodeId);

  const treeItemId = makeDomTreeItemId(rootId, uniqueNodeId);
  const listId = makeDomGroupId(rootId, uniqueNodeId);
  const hasChildren = !!children;

  const renderLabel = () => (
    <StudioButton
      aria-expanded={children ? open : undefined}
      aria-level={level}
      aria-owns={listId}
      aria-selected={selected}
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
      asChild
    >
      <div className={classes.label}>{label}</div>
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
