import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
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
import {
  FieldType,
  getNodeByPointer,
  getNodeDisplayName,
  ObjectKind,
  UiSchemaNode,
} from '@altinn/schema-model';
import { ISchemaState } from '../../types';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';

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

const useStyles = (isRef: boolean) =>
  makeStyles({
    treeItem: {
      marginLeft: 8,
      '&.Mui-selected': {
        background: '#E3F7FF',
        border: isRef ? '1px dashed #006BD8' : '1px solid #006BD8',
        boxSizing: 'border-box',
        borderRadius: '5px',
      },
      '&.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label, .MuiTreeItem-root.Mui-selected:focus > .MuiTreeItem-content .MuiTreeItem-label':
        {
          backgroundColor: 'transparent',
        },
    },
  });

export function SchemaItem({ item, isPropertiesView, editMode, translate }: SchemaItemProps) {
  const dispatch = useDispatch();
  const keyPrefix = isPropertiesView ? 'properties' : 'definitions';
  const classes = useStyles(item.ref !== undefined)();

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
    const propertyProps = {
      objectKind,
      fieldType: objectKind === ObjectKind.Field ? FieldType.Object : undefined,
      ref: objectKind === ObjectKind.Reference ? '' : undefined,
    };

    item.objectKind === ObjectKind.Combination
      ? // @ts-ignore
        dispatch(addCombinationItem({ path: pointer, props: propertyProps }))
      : // @ts-ignore
        dispatch(addProperty({ path: pointer, props: propertyProps }));
  };

  const handleGoToType = () => {
    if (item.ref) {
      dispatch(navigateToType({ id: item.ref }));
    }
  };

  const childItems = useSelector((state: ISchemaState) => {
    const children: UiSchemaNode[] = [];
    item.children.forEach((childPointer) =>
      children.push(getNodeByPointer(state.uiSchema, childPointer)),
    );
    return children;
  });

  return (
    <TreeItem
      nodeId={getDomFriendlyID(item.pointer)}
      classes={{ root: classes.treeItem }}
      label={
        <SchemaItemLabel
          editMode={editMode}
          icon={getIconStr(item)}
          key={`${item.pointer}-label`}
          label={getNodeDisplayName(item)}
          translate={translate}
          limitedItem={item.objectKind === ObjectKind.Combination}
          onAddProperty={item.fieldType === FieldType.Object ? handleAddProperty : undefined}
          onAddReference={
            item.fieldType === FieldType.Object || item.objectKind === ObjectKind.Combination
              ? handleAddProperty
              : undefined
          }
          onAddCombination={item.fieldType === FieldType.Object ? handleAddProperty : undefined}
          onDelete={handleDeleteClick}
          onGoToType={
            item.objectKind === ObjectKind.Combination && isPropertiesView
              ? handleGoToType
              : undefined
          }
          onPromote={
            item.objectKind === ObjectKind.Combination || item.pointer.startsWith('#/def')
              ? undefined
              : handlePromoteClick
          }
        />
      }
      onLabelClick={(e) => onItemClick(e, item)}
    >
      {childItems.map((property: UiSchemaNode) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          item={property}
          key={`${keyPrefix}-${property.pointer}`}
          translate={translate}
          onLabelClick={(e: any) => onItemClick(e, property)}
        />
      ))}
    </TreeItem>
  );
}
