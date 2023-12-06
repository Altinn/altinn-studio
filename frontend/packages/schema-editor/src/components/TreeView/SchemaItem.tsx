import React from 'react';
import { TreeItem } from '@mui/x-tree-view';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getIconStr } from './tree-view-helpers';
import type { UiSchemaNode } from '@altinn/schema-model';
import { ObjectKind, changeChildrenOrder, splitPointerInBaseAndName } from '@altinn/schema-model';
import classes from './SchemaItem.module.css';
import classNames from 'classnames';
import { DndItem } from './DnDWrapper';
import type { DragItem } from './dnd-helpers';
import { selectedIdSelector } from '@altinn/schema-editor/selectors/reduxSelectors';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { isReference } from '../../../../schema-model';

export type SchemaItemProps = {
  selectedNode: UiSchemaNode;
  isPropertiesView: boolean;
  onLabelClick?: (e: any) => void;
  index: number;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

export function SchemaItem({ selectedNode, isPropertiesView, index }: SchemaItemProps) {
  const dispatch = useDispatch();
  const { schemaModel, save } = useSchemaEditorAppContext();

  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';

  const refNode = isReference(selectedNode) ? schemaModel.getReferredNode(selectedNode) : undefined;
  const childNodes = schemaModel.getChildNodes((refNode || selectedNode).pointer);
  const selectedPointer = useSelector(selectedIdSelector);
  const onLabelClick = (e: any, schemaItem: UiSchemaNode) => {
    e.preventDefault();
    if (selectedPointer !== schemaItem.pointer) {
      dispatch(setSelectedId({ pointer: schemaItem.pointer }));
    }
  };
  const isRef = selectedNode.objectKind === ObjectKind.Reference;
  const { base } = splitPointerInBaseAndName(selectedNode.pointer);
  const onMove = (from: DragItem, to: DragItem) =>
    save(changeChildrenOrder(schemaModel, { pointerA: from.itemId, pointerB: to.itemId }));

  return (
    <TreeItem
      nodeId={selectedNode.pointer}
      classes={{ root: classNames(classes.treeItem, isRef && classes.isRef) }}
      onClick={(e: any) => onLabelClick(e, selectedNode)}
      onFocusCapture={(e: any) => e.stopPropagation()}
      label={
        <DndItem index={index} itemId={selectedNode.pointer} containerId={base} onMove={onMove}>
          <SchemaItemLabel
            icon={getIconStr(refNode ?? selectedNode)}
            key={`${selectedNode.pointer}-label`}
            selectedNode={selectedNode}
            refNode={refNode}
            hasReferredNodes={isPropertiesView ? false : isReference(selectedNode)}
          />
        </DndItem>
      }
    >
      {childNodes.map((childNode: UiSchemaNode, childNodeIndex: number) => (
        <SchemaItem
          index={childNodeIndex}
          isPropertiesView={isPropertiesView}
          selectedNode={childNode}
          key={`${keyPrefix}-${childNode.pointer}`}
          onLabelClick={(e: any) => onLabelClick(e, childNode)}
        />
      ))}
    </TreeItem>
  );
}
