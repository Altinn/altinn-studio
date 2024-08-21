import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { StudioTreeView } from '@studio/components';
import type { ReactNode } from 'react';
import React, { useContext } from 'react';
import { DragAndDropTreeRootContext } from '../DragAndDropTreeRoot';
import { DragAndDropTreeItemContext } from './DragAndDropTreeItemContext';
import classes from './DragAndDropTreeItem.module.css';
import cn from 'classnames';
import { EmptyList } from 'app-shared/components/DragAndDropTree/EmptyList/EmptyList';

export interface DragAndDropTreeItemProps {
  children?: ReactNode;
  emptyMessage?: string;
  expandable?: boolean;
  icon?: ReactNode;
  label: string;
  labelWrapper?: (children: ReactNode) => ReactNode;
  uniqueNodeId: string;
  title?: string;
}

export const DragAndDropTreeItem = ({
  children,
  emptyMessage,
  expandable,
  icon,
  label,
  labelWrapper,
  uniqueNodeId,
  title,
}: DragAndDropTreeItemProps) => {
  const { hoveredNodeParent, setHoveredNodeParent } = useContext(DragAndDropTreeRootContext);
  const { nodeId: uniqueParentId } = useContext(DragAndDropTreeItemContext);

  const isExpandable = expandable || Boolean(children);
  const renderLabel = labelWrapper ?? ((node) => node);
  const handleDragOver = () => setHoveredNodeParent(uniqueParentId);
  const hasHoveredItemClass = hoveredNodeParent === uniqueNodeId ? classes.hasHoveredItem : null;
  const labelButtonWrapperClass = cn(classes.labelButtonWrapper, hasHoveredItemClass);

  return (
    <DragAndDrop.ListItem
      as='li'
      itemId={uniqueNodeId}
      onDragOver={handleDragOver}
      renderItem={(dragHandleRef) => (
        <DragAndDropTreeItemContext.Provider value={{ nodeId: uniqueNodeId }}>
          <StudioTreeView.Item
            as='div'
            className={cn(classes.item, hasHoveredItemClass)}
            uniqueNodeId={uniqueNodeId}
            icon={icon}
            label={label}
            labelWrapper={(node) => (
              <div ref={dragHandleRef} className={labelButtonWrapperClass}>
                {renderLabel(node)}
              </div>
            )}
            title={title}
          >
            {isExpandable && renderChildren(children, emptyMessage)}
          </StudioTreeView.Item>
        </DragAndDropTreeItemContext.Provider>
      )}
    />
  );
};

const renderChildren = (children: ReactNode, emptyMessage?: string) => {
  const content = children || <EmptyList>{emptyMessage}</EmptyList>;
  return <DragAndDrop.List>{content}</DragAndDrop.List>;
};
