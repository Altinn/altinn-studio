/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import { useDispatch, useSelector } from 'react-redux';
import { addProperty, deleteProperty, setSelectedId } from '../features/editor/schemaEditorSlice';
import { ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { SchemaItemLabel } from './SchemaItemLabel';

type SchemaItemProps = TreeItemProps & {
  item: UiSchemaItem;
  keyPrefix: string;
  language: ILanguage;
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

const getRefItem = (schema: any[], id: string | undefined): UiSchemaItem => {
  return schema.find((item) => item.id === id);
};

function SchemaItem(props: SchemaItemProps) {
  const dispatch = useDispatch();
  const {
    item, keyPrefix, ...other
  } = props;
  const classes = useStyles(item.$ref !== undefined)();

  const [itemToDisplay, setItemToDisplay] = React.useState<UiSchemaItem>(item);
  const refItem: UiSchemaItem = useSelector((state: ISchemaState) => getRefItem(state.uiSchema, item.$ref));
  // if item props changed, update with latest item, or if reference, refItem.
  React.useEffect(() => {
    setItemToDisplay(refItem ?? item);
  }, [item.restrictions, item, refItem]);

  const onItemClick = (e: UiSchemaItem) => {
    dispatch(setSelectedId({ id: e.id }));
  };

  const renderProperties = (itemProperties: UiSchemaItem[]) => itemProperties.map((property: UiSchemaItem) => {
    return (
      <SchemaItem
        keyPrefix={`${keyPrefix}-properties`}
        key={`${keyPrefix}-${property.id}`}
        item={property}
        nodeId={`${keyPrefix}-${property.id}`}
        onClick={() => onItemClick(property)}
        language={props.language}
      />
    );
  });

  const renderRefLink = () => <SchemaItem
    keyPrefix={`${keyPrefix}-${refItem.id}`}
    key={`${keyPrefix}-${refItem.id}`}
    onClick={() => onItemClick(refItem)}
    item={refItem}
    nodeId={`${keyPrefix}-${refItem.id}-ref`}
    language={props.language}
  />;

  const handleDeleteClick = () => {
    dispatch(deleteProperty({ path: item.id }));
  };

  const handleAddProperty = () => {
    dispatch(addProperty({
      path: itemToDisplay.id,
    }));
  };

  const getIconStr = () => {
    const type = item.type;
    if (refItem) {
      return 'fa-datamodel-ref';
    }
    return type ? `fa-datamodel-${type}` : 'fa-datamodel-object';
  };

  const renderLabel = () => {
    const iconStr = getIconStr();
    const label = refItem ? `${item.displayName} : ${itemToDisplay.displayName}` : item.displayName;
    return <SchemaItemLabel
      language={props.language}
      icon={iconStr}
      label={label}
      onAddProperty={handleAddProperty}
      onDelete={handleDeleteClick}
    />;
  };

  const renderTreeChildren = () => {
    const items = [];
    if (itemToDisplay.$ref && refItem) {
      items.push(renderRefLink());
    }
    if (itemToDisplay.properties) {
      items.push(renderProperties(itemToDisplay.properties));
    }
    return items;
  };
  return (
    <TreeItem
      classes={{ root: classes.treeItem }}
      label={renderLabel()}
      onClick={() => onItemClick(itemToDisplay)}
      {...other}
    >
      { renderTreeChildren() }
    </TreeItem>
  );
}

export default SchemaItem;
