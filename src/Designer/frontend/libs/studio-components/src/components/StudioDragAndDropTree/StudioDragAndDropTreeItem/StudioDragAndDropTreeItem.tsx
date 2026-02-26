import { StudioTreeView } from '../../StudioTreeView';
import { StudioDragAndDrop } from '../../StudioDragAndDrop';
import type { ReactNode } from 'react';
import React, { useContext } from 'react';
import { StudioDragAndDropTreeRootContext } from '../StudioDragAndDropTreeRoot';
import { StudioDragAndDropTreeItemContext } from './StudioDragAndDropTreeItemContext';
import classes from './StudioDragAndDropTreeItem.module.css';
import cn from 'classnames';
import { StudioEmptyList } from '../StudioEmptyList';

export interface StudioDragAndDropTreeItemProps {
  children?: ReactNode;
  emptyMessage?: string;
  expandable?: boolean;
  icon?: ReactNode;
  label: string;
  labelWrapper?: (children: ReactNode) => ReactNode;
  nodeId: string;
  title?: string;
}

export const StudioDragAndDropTreeItem = ({
  children,
  emptyMessage,
  expandable,
  icon,
  label,
  labelWrapper,
  nodeId,
  title,
}: StudioDragAndDropTreeItemProps): React.JSX.Element | undefined => {
  const { hoveredNodeParent, setHoveredNodeParent } = useContext(StudioDragAndDropTreeRootContext);
  const { nodeId: parentId } = useContext(StudioDragAndDropTreeItemContext);

  const isExpandable = expandable || Boolean(children);
  const renderLabel = labelWrapper ?? ((node): React.ReactNode => node);
  const handleDragOver = setHoveredNodeParent
    ? (): ReturnType<typeof setHoveredNodeParent> | undefined => setHoveredNodeParent?.(parentId)
    : undefined;
  const hasHoveredItemClass = hoveredNodeParent === nodeId ? classes.hasHoveredItem : null;
  const labelButtonWrapperClass = cn(classes.labelButtonWrapper, hasHoveredItemClass);

  return (
    <StudioDragAndDrop.ListItem
      as='li'
      itemId={nodeId}
      onDragOver={handleDragOver}
      renderItem={(dragHandleRef) => (
        <StudioDragAndDropTreeItemContext.Provider value={{ nodeId }}>
          <StudioTreeView.Item
            as='div'
            className={cn(classes.item, hasHoveredItemClass)}
            nodeId={nodeId}
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
        </StudioDragAndDropTreeItemContext.Provider>
      )}
    />
  );
};

const renderChildren = (children: ReactNode, emptyMessage?: string): React.ReactElement => {
  const content = children || <StudioEmptyList>{emptyMessage}</StudioEmptyList>;
  return <StudioDragAndDrop.List>{content}</StudioDragAndDrop.List>;
};
