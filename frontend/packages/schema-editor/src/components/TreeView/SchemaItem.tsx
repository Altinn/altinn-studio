import React from 'react';
import { TreeItem } from '@mui/x-tree-view';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedId } from '../../features/editor/schemaEditorSlice';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getIconStr } from './tree-view-helpers';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  getChildNodesByPointer,
  getReferredNodes,
  ObjectKind,
  changeChildrenOrder,
  splitPointerInBaseAndName,
} from '@altinn/schema-model';
import classes from './SchemaItem.module.css';
import classNames from 'classnames';
import { DndItem } from './DnDWrapper';
import type { DragItem } from './dnd-helpers';
import { getRefNodeSelector } from '@altinn/schema-editor/selectors/schemaSelectors';
import { selectedIdSelector } from '@altinn/schema-editor/selectors/reduxSelectors';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

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
  const { data, save } = useSchemaEditorAppContext();

  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';

  const refNode = getRefNodeSelector(selectedNode)(data);
  const childNodes = getChildNodesByPointer(data, (refNode || selectedNode).pointer);
  const referredNodes = getReferredNodes(data, selectedNode.pointer);
  const focusedNode = refNode ?? selectedNode;
  const childNodesSorted: UiSchemaNodes = [];
  focusedNode.children.forEach((childPointer) => {
    const node = childNodes.find((childNode) => childNode.pointer === childPointer);
    node && childNodesSorted.push(node);
  });
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
    save(changeChildrenOrder(data, { pointerA: from.itemId, pointerB: to.itemId }));

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
            hasReferredNodes={isPropertiesView ? false : referredNodes.length > 0}
          />
        </DndItem>
      }
    >
      {childNodesSorted.map((childNode: UiSchemaNode, childNodeIndex: number) => (
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
