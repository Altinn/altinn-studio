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
  getChildNodesByPointer,
  getNodeDisplayName,
  getNodeIndexByPointer,
  Keywords,
  makePointer,
  ObjectKind,
} from '@altinn/schema-model';
import type { ISchemaState } from '../../types';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './SchemaItem.module.css';
import classNames from "classnames";

type SchemaItemProps = {
  item: UiSchemaNode;
  translate: (key: string) => string;
  isPropertiesView?: boolean;
  editMode: boolean;
  onLabelClick?: (e: any) => void;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

export function SchemaItem({ item, isPropertiesView, editMode, translate }: SchemaItemProps) {
  const dispatch = useDispatch();
  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';
  const isRef = item.objectKind == ObjectKind.Reference;

  const onItemClick = (e: any, schemaItem: UiSchemaNode) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.pointer }));
  };

  const handlePromoteClick = () => dispatch(promoteProperty({ path: item.pointer }));

  const handleDeleteClick = () =>
    item.objectKind === ObjectKind.Combination
      ? dispatch(deleteCombinationItem({ path: item.pointer }))
      : dispatch(deleteProperty({ path: item.pointer }));

  const handleAddProperty = (objectKind: ObjectKind) => {
    const { pointer } = item;
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

    item.objectKind === ObjectKind.Combination
      ? dispatch(addCombinationItem({ path: pointer, props: propertyProps }))
      : dispatch(addProperty({ path: pointer, props: propertyProps }));
  };

  const handleGoToType = () => {
    if (item.ref) {
      dispatch(navigateToType({ id: item.ref }));
    }
  };
  const itemsPointer = makePointer(item.pointer, Keywords.Items);

  const childNodes = useSelector((state: ISchemaState) => {
    if (item.objectKind === ObjectKind.Array) {
      const itemsIndex = getNodeIndexByPointer(state.uiSchema, itemsPointer);
      return itemsIndex ? getChildNodesByPointer(state.uiSchema, itemsPointer) : [];
    } else {
      return getChildNodesByNode(state.uiSchema, item);
    }
  });
  const itemNode = useSelector((state: ISchemaState) => {
    const itemsIndex = getNodeIndexByPointer(state.uiSchema, itemsPointer);
    return itemsIndex ? state.uiSchema[itemsIndex] : undefined;
  });
  return (
    <TreeItem
      nodeId={getDomFriendlyID(item.pointer)}
      classes={{ root: classNames(classes.treeItem, isRef && classes.isRef) }}
      label={
        <SchemaItemLabel
          editMode={editMode}
          icon={getIconStr(item)}
          key={`${item.pointer}-label`}
          label={
            <>
              <span>{getNodeDisplayName(item)}</span>
              {isRef && <span className={classes.referenceLabel}>{item.ref}</span>}
              {item.objectKind === ObjectKind.Array && (
                <span className={classes.referenceLabel}>{itemNode?.fieldType}</span>
              )}
            </>
          }
          translate={translate}
          limitedItem={item.objectKind === ObjectKind.Combination}
          onAddProperty={
            item.objectKind === ObjectKind.Field && item.fieldType === FieldType.Object ? handleAddProperty : undefined
          }
          onAddReference={
            item.objectKind === ObjectKind.Field || item.objectKind === ObjectKind.Combination
              ? handleAddProperty
              : undefined
          }
          onAddCombination={item.fieldType === FieldType.Object ? handleAddProperty : undefined}
          onDelete={handleDeleteClick}
          onGoToType={item.objectKind === ObjectKind.Combination && isPropertiesView ? handleGoToType : undefined}
          onPromote={
            item.objectKind === ObjectKind.Combination || item.pointer.startsWith('#/$defs')
              ? undefined
              : handlePromoteClick
          }
        />
      }
      onLabelClick={(e) => onItemClick(e, item)}
    >
      {childNodes.map((childNode: UiSchemaNode) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          item={childNode}
          key={`${keyPrefix}-${childNode.pointer}`}
          translate={translate}
          onLabelClick={(e: any) => onItemClick(e, childNode)}
        />
      ))}
    </TreeItem>
  );
}
