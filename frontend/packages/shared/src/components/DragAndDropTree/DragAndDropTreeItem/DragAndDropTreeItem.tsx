import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { TreeView } from 'app-shared/components/TreeView';
import React, { ReactNode, useContext } from 'react';
import { DragAndDropTreeRootContext } from '../DragAndDropTreeRoot';
import { DragAndDropTreeItemContext } from './DragAndDropTreeItemContext';
import classes from './DragAndDropTreeItem.module.css';
import cn from 'classnames';

export interface DragAndDropTreeItemProps {
  children?: ReactNode;
  icon?: ReactNode;
  label: string;
  labelWrapper?: (children: ReactNode) => ReactNode;
  nodeId: string;
}

export const DragAndDropTreeItem = ({
  children,
  icon,
  label,
  labelWrapper,
  nodeId,
}: DragAndDropTreeItemProps) => {
  const { hoveredNodeParent, setHoveredNodeParent } = useContext(DragAndDropTreeRootContext);
  const { nodeId: parentId } = useContext(DragAndDropTreeItemContext);

  const subList = children ? <DragAndDrop.List>{children}</DragAndDrop.List> : null;
  const renderLabel = labelWrapper ?? ((node) => node);
  const handleDragOver = () => setHoveredNodeParent(parentId);
  const hasHoveredItemClass = hoveredNodeParent === nodeId ? classes.hasHoveredItem : null;
  const labelButtonWrapperClass = cn(classes.labelButtonWrapper, hasHoveredItemClass);

  return (
    <DragAndDrop.ListItem
      as='li'
      itemId={nodeId}
      onDragOver={handleDragOver}
      renderItem={(dragHandleRef) => (
        <DragAndDropTreeItemContext.Provider value={{ nodeId }}>
          <TreeView.Item
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
          >
            {subList}
          </TreeView.Item>
        </DragAndDropTreeItemContext.Provider>
      )}
    />
  );
};
