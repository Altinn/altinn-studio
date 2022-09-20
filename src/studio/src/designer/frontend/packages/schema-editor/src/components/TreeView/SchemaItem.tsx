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

import { CombinationKind, FieldType, UiSchemaItem } from '../../types';
import { ObjectKind } from '../../types/enums';
import { SchemaItemLabel } from './SchemaItemLabel';
import { createRefSelector, getIconStr } from './tree-view-helpers';
import { getDomFriendlyID } from '../../utils/schema';

type SchemaItemProps = {
  item: UiSchemaItem;
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
  const [itemToDisplay, setItemToDisplay] = React.useState<UiSchemaItem>(item);
  const refItem: UiSchemaItem | undefined = useSelector(createRefSelector(item.$ref ?? item.items?.$ref));
  const classes = useStyles(refItem !== undefined)();
  // if item props changed, update with latest item, or if reference, refItem.
  React.useEffect(() => setItemToDisplay(item), [item.restrictions, item, refItem]);

  const onItemClick = (e: any, schemaItem: UiSchemaItem) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.path }));
  };

  const handlePromoteClick = () => dispatch(promoteProperty({ path: item.path }));

  const handleDeleteClick = () =>
    item.combinationItem
      ? dispatch(deleteCombinationItem({ path: item.path }))
      : dispatch(deleteProperty({ path: item.path }));

  const handleAddProperty = (objectKind: ObjectKind) => {
    const { path } = itemToDisplay;
    const propertyProps = {
      type: objectKind === ObjectKind.Field ? FieldType.Object : undefined,
      $ref: objectKind === ObjectKind.Reference ? '' : undefined,
      combination: objectKind === ObjectKind.Combination ? [] : undefined,
      combinationKind: objectKind === ObjectKind.Combination ? CombinationKind.AllOf : undefined,
    } as UiSchemaItem;

    itemToDisplay.combination
      ? dispatch(addCombinationItem({ path, props: propertyProps }))
      : dispatch(addProperty({ path, props: propertyProps }));
  };

  const handleGoToType = () => {
    if (item.$ref) {
      dispatch(navigateToType({ id: item.$ref }));
    }
  };

  let childItems = [];

  if (itemToDisplay.$ref && refItem) {
    childItems.push(refItem);
  }
  if (itemToDisplay.properties) {
    childItems = childItems.concat(itemToDisplay.properties);
  }
  if (item.combination) {
    childItems = childItems.concat(item.combination);
  }

  return (
    <TreeItem
      nodeId={getDomFriendlyID(item.path)}
      classes={{ root: classes.treeItem }}
      label={
        <SchemaItemLabel
          editMode={editMode}
          icon={getIconStr(item)}
          key={`${item.path}-label`}
          label={refItem ? `${item.displayName} : ${refItem.displayName}` : item.displayName}
          translate={translate}
          limitedItem={item.combinationItem}
          onAddProperty={item.type === FieldType.Object ? handleAddProperty : undefined}
          onAddReference={item.type === FieldType.Object || item.combination ? handleAddProperty : undefined}
          onAddCombination={item.type === FieldType.Object ? handleAddProperty : undefined}
          onDelete={handleDeleteClick}
          onGoToType={item.$ref && isPropertiesView ? handleGoToType : undefined}
          onPromote={item.$ref !== undefined || item.path.startsWith('#/def') ? undefined : handlePromoteClick}
        />
      }
      onLabelClick={(e) => onItemClick(e, itemToDisplay)}
    >
      {childItems.map((property: UiSchemaItem) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          item={property}
          key={`${keyPrefix}-${property.path}`}
          translate={translate}
          onLabelClick={(e: any) => onItemClick(e, property)}
        />
      ))}
    </TreeItem>
  );
}
