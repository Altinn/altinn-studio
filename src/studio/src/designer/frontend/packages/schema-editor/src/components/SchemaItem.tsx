/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Menu, MenuItem } from '@material-ui/core';
import { addProperty, deleteProperty, setSelectedId } from '../features/editor/schemaEditorSlice';
import { ISchemaState, UiSchemaItem } from '../types';

type SchemaItemProps = TreeItemProps & {
  item: UiSchemaItem;
  keyPrefix: string;
};

const useStyles = makeStyles({
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
    border: '1px solid black',
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
      border: '1px dashed #006BD8',
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
  const classes = useStyles();
  const dispatch = useDispatch();
  const {
    item, keyPrefix, ...other
  } = props;

  const [itemToDisplay, setItemToDisplay] = React.useState<UiSchemaItem>(item);
  const refItem: UiSchemaItem = useSelector((state: ISchemaState) => getRefItem(state.uiSchema, item.$ref));
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);

  // if item props changed, update with latest item, or if reference, refItem.
  React.useEffect(() => {
    setItemToDisplay(refItem ?? item);
  }, [item.keywords, item, refItem]);

  const onItemClick = (e: UiSchemaItem) => {
    dispatch(setSelectedId({ id: e.id }));
  };
  const icon = (name: string) => <span className={classes.iconContainer}><i className={`fa ${name}`} style={{ color: 'white', textAlign: 'center' }} /></span>;

  const renderProperties = (itemProperties: UiSchemaItem[]) => itemProperties.map((property: UiSchemaItem) => {
    return (
      <SchemaItem
        keyPrefix={`${keyPrefix}-properties`}
        key={`${keyPrefix}-${property.id}`}
        item={property}
        nodeId={`${keyPrefix}-${property.id}`}
        onClick={() => onItemClick(property)}
      />
    );
  });

  const handleCloseContextMenu = (e: React.MouseEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
  };

  const renderRefLink = () => <SchemaItem
    keyPrefix={`${keyPrefix}-${refItem.id}`}
    key={`${keyPrefix}-${refItem.id}`}
    onClick={() => onItemClick(refItem)}
    item={refItem}
    nodeId={`${keyPrefix}-${refItem.id}-ref`}
  />;

  const renderLabelText = () => {
    if (refItem) {
      return <>{ icon('fa-datamodel-ref') } {item.name ?? item.id} {`: ${itemToDisplay.name ?? itemToDisplay.id}`}</>;
    }
    return <>{ icon('fa-datamodel-object') } {item.name ?? item.id}</>;
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextAnchor(null);
    dispatch(deleteProperty({ path: item.id }));
  };

  const handleAddProperty = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextAnchor(null);
    dispatch(addProperty({
      path: itemToDisplay.id,
    }));
  };
  const handleContextMenuClick = (e: React.MouseEvent) => {
    setContextAnchor(e.currentTarget);
    e.stopPropagation();
  };
  const renderLabel = () => (
    <div className={classes.labelRoot}>
      <Typography className={classes.label}>{renderLabelText()}</Typography>
      <IconButton
        className={classes.contextButton}
        aria-controls='simple-menu' aria-haspopup='true'
        id='open-context-menu-button'
        onClick={handleContextMenuClick}
      ><i className='fa fa-ellipsismenu'/>
      </IconButton>
      <Menu
        id={`${item.id}-context-menu`}
        anchorEl={contextAnchor}
        keepMounted
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        <MenuItem onClick={handleAddProperty}><i className={`${classes.menuItem} fa fa-plus`}/> Add property</MenuItem>
        <MenuItem><i className='fa fa-clone'/> Import</MenuItem>
        <MenuItem onClick={handleDeleteClick}><i className='fa fa-trash'/> Delete</MenuItem>
      </Menu>
    </div>
  );
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
