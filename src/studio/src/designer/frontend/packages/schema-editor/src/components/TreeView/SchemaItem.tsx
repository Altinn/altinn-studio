import React from 'react';
import TreeItem from '@material-ui/lab/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import { changeChildrenOrder, setSelectedId } from '../../features/editor/schemaEditorSlice';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getIconStr } from './tree-view-helpers';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  getChildNodesByNode,
  getNodeByPointer,
  getNodeIndexByPointer,
  Keywords,
  makePointer,
  ObjectKind,
  splitPointerInBaseAndName,
} from '@altinn/schema-model';
import type { ISchemaState } from '../../types';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './SchemaItem.module.css';
import classNames from 'classnames';
import { DndItem } from './DnDWrapper';
import { DragItem } from './dnd-helpers';

type SchemaItemProps = {
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
  isPropertiesView?: boolean;
  editMode: boolean;
  onLabelClick?: (e: any) => void;
  index: number;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

export function SchemaItem({ selectedNode, isPropertiesView, editMode, translate, index }: SchemaItemProps) {
  const dispatch = useDispatch();
  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';

  const itemsPointer = makePointer(selectedNode.pointer, Keywords.Items);

  const itemsNode = useSelector((state: ISchemaState) => {
    const itemsIndex = getNodeIndexByPointer(state.uiSchema, itemsPointer);
    return itemsIndex ? state.uiSchema[itemsIndex] : undefined;
  });
  const refNode = useSelector((state: ISchemaState) => {
    if (selectedNode.objectKind === ObjectKind.Array && itemsNode?.ref) {
      return getNodeByPointer(state.uiSchema, itemsNode.ref);
    } else if (selectedNode.objectKind === ObjectKind.Reference && selectedNode.ref) {
      return getNodeByPointer(state.uiSchema, selectedNode.ref);
    } else {
      return undefined;
    }
  });
  const childNodes = useSelector((state: ISchemaState) => {
    if (refNode) {
      return getChildNodesByNode(state.uiSchema, refNode);
    } else if (itemsNode) {
      return getChildNodesByNode(state.uiSchema, itemsNode);
    } else {
      return getChildNodesByNode(state.uiSchema, selectedNode);
    }
  });
  const focused = refNode ?? itemsNode ?? selectedNode;
  const childNodesSorted: UiSchemaNodes = [];
  focused.children.forEach((childPointer) => {
    const node = childNodes.find((node) => node.pointer === childPointer);
    node && childNodesSorted.push(node);
  });
  const onLabelClick = (e: any, schemaItem: UiSchemaNode) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.pointer }));
  };
  const isRef = selectedNode.objectKind === ObjectKind.Reference || itemsNode?.objectKind === ObjectKind.Reference;
  const { base } = splitPointerInBaseAndName(selectedNode.pointer);
  const onMove = (from: DragItem, to: DragItem) =>
    dispatch(changeChildrenOrder({ pointerA: from.itemId, pointerB: to.itemId }));
  return (
    <DndItem index={index} itemId={selectedNode.pointer} containerId={base} onMove={onMove}>
      <TreeItem
        nodeId={getDomFriendlyID(selectedNode.pointer)}
        classes={{ root: classNames(classes.treeItem, isRef && classes.isRef) }}
        label={
          <SchemaItemLabel
            editMode={editMode}
            icon={getIconStr(refNode ?? itemsNode ?? selectedNode)}
            key={`${selectedNode.pointer}-label`}
            selectedNode={selectedNode}
            refNode={refNode}
            itemsNode={itemsNode}
            translate={translate}
          />
        }
        onLabelClick={(e) => onLabelClick(e, selectedNode)}
      >
        {childNodesSorted.map((childNode: UiSchemaNode, index: number) => (
          <SchemaItem
            index={index}
            editMode={editMode}
            isPropertiesView={isPropertiesView}
            selectedNode={childNode}
            key={`${keyPrefix}-${childNode.pointer}`}
            translate={translate}
            onLabelClick={(e: any) => onLabelClick(e, childNode)}
          />
        ))}
      </TreeItem>
    </DndItem>
  );
}
