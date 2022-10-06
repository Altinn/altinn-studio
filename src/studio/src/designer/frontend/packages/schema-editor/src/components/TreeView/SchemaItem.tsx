import React from 'react';
import TreeItem from '@material-ui/lab/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCombinationItem,
  addProperty,
  deleteCombinationItem,
  deleteProperty,
  navigateToType,
  promoteProperty,
  setSelectedId,
} from '../../features/editor/schemaEditorSlice';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getIconStr } from './tree-view-helpers';
import type { UiSchemaNode } from '@altinn/schema-model';
import {
  CombinationKind,
  FieldType,
  getChildNodesByNode,
  getNodeByPointer,
  getNodeDisplayName,
  getNodeIndexByPointer,
  Keywords,
  makePointer,
  ObjectKind,
} from '@altinn/schema-model';
import type { ISchemaState } from '../../types';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './SchemaItem.module.css';
import classNames from 'classnames';

type SchemaItemProps = {
  selectedNode: UiSchemaNode;
  translate: (key: string) => string;
  isPropertiesView?: boolean;
  editMode: boolean;
  onLabelClick?: (e: any) => void;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

export function SchemaItem({ selectedNode, isPropertiesView, editMode, translate }: SchemaItemProps) {
  const dispatch = useDispatch();
  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';

  const onItemClick = (e: any, schemaItem: UiSchemaNode) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.pointer }));
  };

  const handlePromoteClick = () => dispatch(promoteProperty({ path: selectedNode.pointer }));

  const handleDeleteClick = () =>
    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(deleteCombinationItem({ path: selectedNode.pointer }))
      : dispatch(deleteProperty({ path: selectedNode.pointer }));

  const handleAddProperty = (objectKind: ObjectKind) => {
    const { pointer } = selectedNode;
    const defaultFieldType: any = {
      [ObjectKind.Field]: FieldType.String,
      [ObjectKind.Combination]: CombinationKind.AllOf,
      [ObjectKind.Array]: FieldType.Array,
      [ObjectKind.Reference]: undefined,
    };
    const propertyProps = {
      objectKind,
      fieldType: defaultFieldType[objectKind],
      ref: objectKind === ObjectKind.Reference ? '' : undefined,
    };

    selectedNode.objectKind === ObjectKind.Combination
      ? dispatch(addCombinationItem({ path: pointer, props: propertyProps }))
      : dispatch(addProperty({ path: pointer, props: propertyProps }));
  };

  const handleGoToType = () => {
    if (selectedNode.ref) {
      dispatch(navigateToType({ id: selectedNode.ref }));
    }
  };
  const itemsPointer = makePointer(selectedNode.pointer, Keywords.Items);

  const itemsNode = useSelector((state: ISchemaState) => {
    const itemsIndex = getNodeIndexByPointer(state.uiSchema, itemsPointer);
    return itemsIndex ? state.uiSchema[itemsIndex] : undefined;
  });
  const refNode = useSelector((state: ISchemaState) => {
    if (
      selectedNode.objectKind === ObjectKind.Array &&
      itemsNode?.ref &&
      itemsNode.objectKind === ObjectKind.Reference
    ) {
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
  const isRef = selectedNode.objectKind === ObjectKind.Reference || itemsNode?.objectKind === ObjectKind.Reference;
  return (
    <TreeItem
      nodeId={getDomFriendlyID(selectedNode.pointer)}
      classes={{ root: classNames(classes.treeItem, isRef && classes.isRef) }}
      label={
        <SchemaItemLabel
          editMode={editMode}
          isArray={selectedNode.objectKind === ObjectKind.Array || refNode?.objectKind === ObjectKind.Array}
          isRef={
            !!((isPropertiesView && selectedNode.pointer.startsWith(makePointer(Keywords.Definitions))) || refNode)
          }
          icon={getIconStr(refNode ?? itemsNode ?? selectedNode)}
          key={`${selectedNode.pointer}-label`}
          label={
            <>
              <span>{getNodeDisplayName(selectedNode)}</span>
              {selectedNode.isRequired && <span> *</span>}
              {refNode && <span className={classes.referenceLabel}>{refNode.pointer}</span>}
            </>
          }
          translate={translate}
          limitedItem={selectedNode.objectKind === ObjectKind.Combination}
          onAddProperty={
            selectedNode.objectKind === ObjectKind.Field && selectedNode.fieldType === FieldType.Object
              ? handleAddProperty
              : undefined
          }
          onAddReference={
            selectedNode.objectKind === ObjectKind.Field || selectedNode.objectKind === ObjectKind.Combination
              ? handleAddProperty
              : undefined
          }
          onAddCombination={selectedNode.fieldType === FieldType.Object ? handleAddProperty : undefined}
          onDelete={handleDeleteClick}
          onGoToType={
            selectedNode.objectKind === ObjectKind.Combination && isPropertiesView ? handleGoToType : undefined
          }
          onPromote={
            selectedNode.objectKind === ObjectKind.Combination || selectedNode.pointer.startsWith('#/$defs')
              ? undefined
              : handlePromoteClick
          }
        />
      }
      onLabelClick={(e) => onItemClick(e, selectedNode)}
    >
      {childNodes.map((childNode: UiSchemaNode) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          selectedNode={childNode}
          key={`${keyPrefix}-${childNode.pointer}`}
          translate={translate}
          onLabelClick={(e: any) => onItemClick(e, childNode)}
        />
      ))}
    </TreeItem>
  );
}
