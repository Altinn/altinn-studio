import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { TreeView } from 'app-shared/components/TreeView';
import React, { ReactNode, useContext } from 'react';
import { DragAndDropTreeRootContext } from '../DragAndDropTreeRoot';
import { DragAndDropTreeItemContext } from './DragAndDropTreeItemContext';
import classes from './DragAndDropTreeItem.module.css';
import cn from 'classnames';

export interface DragAndDropTreeItemProps {
  children?: ReactNode;
  label: string;
  labelWrapper?: (children: ReactNode) => ReactNode;
  nodeId: string;
}

export const DragAndDropTreeItem = ({
  children,
  label,
  labelWrapper,
  nodeId,
}: DragAndDropTreeItemProps) => {
  const { hoveredNodeParent, setHoveredNodeParent } = useContext(DragAndDropTreeRootContext);
  const { nodeId: parentId } = useContext(DragAndDropTreeItemContext);

  const subList = children ? <DragAndDrop.List>{children}</DragAndDrop.List> : null;
  const renderLabel = labelWrapper ?? ((node) => node);
  const handleDragOver = () => setHoveredNodeParent(parentId);

  return (
    <DragAndDrop.ListItem
      as='li'
      itemId={nodeId}
      onDragOver={handleDragOver}
      renderItem={(dragHandleRef) => (
        <DragAndDropTreeItemContext.Provider value={{ nodeId }}>
          <TreeView.Item
            as='div'
            className={cn(classes.item, hoveredNodeParent === nodeId && classes.hasHoveredItem)}
            nodeId={nodeId}
            label={label}
            labelWrapper={(node) => renderLabel(<div ref={dragHandleRef}>{node}</div>)}
          >
            {subList}
          </TreeView.Item>
        </DragAndDropTreeItemContext.Provider>
      )}
    />
  );
};
