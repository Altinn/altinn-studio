import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import {
  addCombinationItem,
  addProperty,
  deleteCombinationItem,
  deleteProperty,
  navigateToType,
  promoteProperty,
  setSelectedId,
} from '../features/editor/schemaEditorSlice';
import type { ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { CombinationKind, FieldType } from '../types';
import { ObjectKind } from '../types/enums';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getDomFriendlyID } from '../utils/schema';

type SchemaItemProps = TreeItemProps & {
  item: UiSchemaItem;
  keyPrefix: string;
  language: ILanguage;
  isPropertiesView?: boolean;
  editMode: boolean;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

const useStyles = (isRef: boolean) =>
  makeStyles({
    root: {
      height: 216,
      flexGrow: 1,
      maxWidth: 800,
    },
    labelRoot: {
      display: 'flex',
      alignItems: 'center',
      padding: 8,
    },
    label: {
      paddingRight: 12,
      lineHeight: '18px',
      flexGrow: 1,
    },
    typeRef: {
      fontSize: '1.6em',
      paddingRight: 24,
    },
    buttonRoot: {
      backgroundColor: 'white',
      border: isRef ? '1px dashed black' : '1px solid black',
      borderRadius: 5,
      marginLeft: 12,
      width: 90,
      textAlign: 'center',
      fontSize: 12,
      '&:hover': {
        backgroundColor: '#1EAEF7',
        color: 'white',
      },
    },
    button: {
      background: 'none',
      border: 'none',
    },
    contextButton: {
      borderRadius: 60,
      margin: 0,
      padding: 10,
      display: 'none',
      '$treeItem :hover > &': {
        display: 'block',
      },
    },
    menuItem: {
      padding: 8,
    },
    iconContainer: {
      background: '#022f51',
      textAlign: 'center',
      padding: '5px 0px 5px 0px',
      marginRight: 4,
      fontSize: '10px',
    },
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
    filler: {
      paddingTop: 5,
      paddingBottom: 5,
    },
  });

const getRefItem = (schema: any[], path: string | undefined): UiSchemaItem => {
  return schema.find((item) => item.path === path);
};

export function SchemaItem(props: SchemaItemProps) {
  const dispatch = useDispatch();
  const { item, keyPrefix, isPropertiesView, editMode, ...other } = props;
  const classes = useStyles(
    item.$ref !== undefined || item.items?.$ref !== undefined,
  )();

  const [itemToDisplay, setItemToDisplay] = React.useState<UiSchemaItem>(item);
  const refItem: UiSchemaItem | undefined = useSelector(
    (state: ISchemaState) => {
      if (item.$ref) {
        return getRefItem(state.uiSchema, item.$ref);
      }
      if (item.items?.$ref) {
        return getRefItem(state.uiSchema, item.items.$ref);
      }
      return undefined;
    },
  );
  // if item props changed, update with latest item, or if reference, refItem.
  React.useEffect(() => {
    setItemToDisplay(item);
  }, [item.restrictions, item, refItem]);

  const onItemClick = (e: any, schemaItem: UiSchemaItem) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.path }));
  };

  const renderProperties = (itemProperties: UiSchemaItem[]) => {
    return itemProperties.map((property: UiSchemaItem) => {
      return (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          item={property}
          key={`${keyPrefix}-${property.path}`}
          keyPrefix={`${keyPrefix}-properties`}
          language={props.language}
          nodeId={`${getDomFriendlyID(property.path)}`}
          onLabelClick={(e) => onItemClick(e, property)}
        />
      );
    });
  };

  const handlePromoteClick = () => {
    dispatch(promoteProperty({ path: item.path }));
  };
  const handleDeleteClick = () => {
    if (item.combinationItem) {
      dispatch(deleteCombinationItem({ path: item.path }));
    } else {
      dispatch(deleteProperty({ path: item.path }));
    }
  };

  const handleAddProperty = (type: ObjectKind) => {
    const path = itemToDisplay.path;
    const propertyProps = {
      type: type === ObjectKind.Field ? FieldType.Object : undefined,
      $ref: type === ObjectKind.Reference ? '' : undefined,
      combination: type === ObjectKind.Combination ? [] : undefined,
      combinationKind:
        type === ObjectKind.Combination ? CombinationKind.AllOf : undefined,
    } as UiSchemaItem;

    if (itemToDisplay.combination) {
      dispatch(
        addCombinationItem({
          path,
          props: propertyProps,
        }),
      );
    } else {
      dispatch(
        addProperty({
          path,
          props: propertyProps,
        }),
      );
    }
  };

  const handleGoToType = () => {
    if (item.$ref) {
      dispatch(
        navigateToType({
          id: item.$ref,
        }),
      );
    }
  };

  const getIconStr = () => {
    const { type } = item;
    if (type !== FieldType.Array && item.$ref !== undefined) {
      return 'fa-datamodel-ref';
    }

    if (item.combination) {
      return 'fa-group';
    }

    if (type === FieldType.Integer) {
      return 'fa-datamodel-number';
    }

    if (type === FieldType.Null) {
      return 'fa-datamodel-object';
    }

    return type ? `fa-datamodel-${type}` : 'fa-datamodel-object';
  };

  const renderTreeChildren = () => {
    const items = [];
    if (itemToDisplay.$ref && refItem) {
      items.push(
        <SchemaItem
          editMode={editMode}
          isPropertiesView={isPropertiesView}
          item={refItem}
          keyPrefix={`${keyPrefix}-${refItem.path}`}
          key={`${keyPrefix}-${refItem.path}`}
          language={props.language}
          nodeId={getDomFriendlyID(refItem.path)}
          onLabelClick={(e) => onItemClick(e, refItem)}
        />,
      );
    }
    if (itemToDisplay.properties) {
      items.push(renderProperties(itemToDisplay.properties));
    }
    if (item.combination) {
      items.push(renderProperties(item.combination));
    }
    return items;
  };
  return (
    <TreeItem
      classes={{ root: classes.treeItem }}
      label={
        <SchemaItemLabel
          editMode={editMode}
          icon={getIconStr()}
          key={`${item.path}-label`}
          label={
            refItem
              ? `${item.displayName} : ${refItem.displayName}`
              : item.displayName
          }
          language={props.language}
          limitedItem={item.combinationItem}
          onAddProperty={
            item.type === FieldType.Object ? handleAddProperty : undefined
          }
          onAddReference={
            item.type === FieldType.Object || item.combination
              ? handleAddProperty
              : undefined
          }
          onAddCombination={
            item.type === FieldType.Object ? handleAddProperty : undefined
          }
          onDelete={handleDeleteClick}
          onGoToType={
            item.$ref && isPropertiesView ? handleGoToType : undefined
          }
          onPromote={
            item.$ref !== undefined || item.path.startsWith('#/def')
              ? undefined
              : handlePromoteClick
          }
        />
      }
      onLabelClick={(e) => onItemClick(e, itemToDisplay)}
      key={item.path}
      {...other}
    >
      {renderTreeChildren()}
    </TreeItem>
  );
}
