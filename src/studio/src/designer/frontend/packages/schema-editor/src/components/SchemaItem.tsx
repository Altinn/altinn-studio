/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import { addCombinationItem, addProperty, deleteCombinationItem, deleteProperty, navigateToType, promoteProperty, setSelectedId } from '../features/editor/schemaEditorSlice';
import { ILanguage, ISchemaState, ObjectKind, UiSchemaItem } from '../types';
import { SchemaItemLabel } from './SchemaItemLabel';
import { getDomFriendlyID } from '../utils';

type SchemaItemProps = TreeItemProps & {
  item: UiSchemaItem;
  keyPrefix: string;
  language: ILanguage;
  isPropertiesView?: boolean;
};

SchemaItem.defaultProps = {
  isPropertiesView: false,
};

const useStyles = (isRef: boolean) => makeStyles({
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
    '&.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label, .MuiTreeItem-root.Mui-selected:focus > .MuiTreeItem-content .MuiTreeItem-label': {
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

function SchemaItem(props: SchemaItemProps) {
  const dispatch = useDispatch();
  const {
    item, keyPrefix, isPropertiesView, ...other
  } = props;
  const classes = useStyles(item.$ref !== undefined || item.items?.$ref !== undefined)();

  const [itemToDisplay, setItemToDisplay] = React.useState<UiSchemaItem>(item);
  const refItem: UiSchemaItem | undefined = useSelector((state: ISchemaState) => {
    if (item.$ref) {
      return getRefItem(state.uiSchema, item.$ref);
    }
    if (item.items?.$ref) {
      return getRefItem(state.uiSchema, item.items.$ref);
    }
    return undefined;
  });
  // if item props changed, update with latest item, or if reference, refItem.
  React.useEffect(() => {
    setItemToDisplay(item);
  }, [item.restrictions, item, refItem]);

  const onItemClick = (e: any, schemaItem: UiSchemaItem) => {
    e.preventDefault();
    dispatch(setSelectedId({ id: schemaItem.path }));
  };

  const renderProperties = (itemProperties: UiSchemaItem[]) => itemProperties.map((property: UiSchemaItem) => {
    return (
      <SchemaItem
        keyPrefix={`${keyPrefix}-properties`}
        key={`${keyPrefix}-${property.path}`}
        item={property}
        nodeId={`${getDomFriendlyID(property.path)}`}
        onLabelClick={(e) => onItemClick(e, property)}
        language={props.language}
        isPropertiesView={isPropertiesView}
      />
    );
  });

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
    const newItem = {
      path: itemToDisplay.path,
      type: (type === 'field' ? 'object' : undefined),
      $ref: (type === 'reference' ? '' : undefined),
      combination: (type === 'combination' ? [] : undefined),
      combinationKind: (type === 'combination' ? 'allOf' : undefined),
    } as UiSchemaItem;

    if (itemToDisplay.combination) {
      dispatch(addCombinationItem({
        ...newItem,
        displayName: (type === 'reference') ? 'ref' : '',
      }));
    } else {
      dispatch(addProperty(newItem));
    }
  };

  const handleGoToType = () => {
    if (item.$ref) {
      dispatch(navigateToType({
        id: item.$ref,
      }));
    }
  };

  const getIconStr = () => {
    const type = item.type;
    if (type !== 'array' && item.$ref !== undefined) {
      return 'fa-datamodel-ref';
    }

    if (item.combination) {
      return 'fa-group';
    }

    if (item.type === 'integer') {
      return 'fa-datamodel-number';
    }

    if (type === 'null') {
      return 'fa-datamodel-object';
    }

    return type ? `fa-datamodel-${type}` : 'fa-datamodel-object';
  };

  const renderTreeChildren = () => {
    const items = [];
    if (itemToDisplay.$ref && refItem) {
      items.push(<SchemaItem
        keyPrefix={`${keyPrefix}-${refItem.path}`}
        key={`${keyPrefix}-${refItem.path}`}
        onLabelClick={(e) => onItemClick(e, refItem)}
        item={refItem}
        nodeId={getDomFriendlyID(refItem.path)}
        language={props.language}
        isPropertiesView={isPropertiesView}
      />);
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
      label={<SchemaItemLabel
        language={props.language}
        icon={getIconStr()}
        label={refItem ? `${item.displayName} : ${refItem.displayName}` : item.displayName}
        onAddProperty={(item.type === 'object') ? handleAddProperty : undefined}
        onAddReference={(item.type === 'object' || (item.combination)) ? handleAddProperty : undefined}
        onAddCombination={(item.type === 'object') ? handleAddProperty : undefined}
        onDelete={handleDeleteClick}
        onPromote={item.$ref !== undefined || item.path.startsWith('#/def') ? undefined : handlePromoteClick}
        onGoToType={(item.$ref && isPropertiesView) ? handleGoToType : undefined}
        key={`${item.path}-label`}
        limitedItem={item.combinationItem}
      />}
      onLabelClick={(e) => onItemClick(e, itemToDisplay)}
      key={item.path}
      {...other}
    >
      { renderTreeChildren() }
    </TreeItem>
  );
}

export default SchemaItem;
