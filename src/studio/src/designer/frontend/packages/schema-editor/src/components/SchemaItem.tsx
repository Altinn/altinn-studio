/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Menu, MenuItem } from '@material-ui/core';
import { addField, deleteProperty, setSelectedId } from '../features/editor/schemaEditorSlice';
import { Field, ISchemaState, UiSchemaItem } from '../types';

type SchemaItemProps = TreeItemProps & {
  item: UiSchemaItem;
  keyPrefix: string;
  // eslint-disable-next-line react/require-default-props
  refSource?: string;
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
      border: '1px solid #006BD8',
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

const getRefItems = (schema: any[], id: string | undefined): any[] => {
  let result: any[] = [];
  if (!id) {
    return result;
  }

  const refItem = schema.find((item) => item.id === id);
  if (refItem) {
    result.push(refItem);
    if (refItem.$ref) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      result = result.concat(getRefItems(schema, refItem.$ref));
    }
  }
  return result;
};

function SchemaItem(props: SchemaItemProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {
    item, refSource, keyPrefix, ...other
  } = props;

  const [definitionItem, setDefinitionItem] = React.useState<any>(item);
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const refItems: any[] = useSelector((state: ISchemaState) => getRefItems(state.uiSchema, item.$ref));
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);

  React.useEffect(() => {
    if (refItems && refItems.length > 0) {
      const refItem = refItems[refItems.length - 1];
      setDefinitionItem(refItem);
    }
  }, [item.fields, refItems]);

  const onItemClick = (itemId: string) => {
    dispatch(setSelectedId({ id: itemId }));
  };
  const icon = (name: string) => <span className={classes.iconContainer}><i className={`fa ${name}`} style={{ color: 'white', textAlign: 'center' }} /></span>;

  const RenderProperties = (itemProperties: any[] | undefined) => {
    if (itemProperties && itemProperties.length > 0) {
      return (
        <TreeItem
          classes={{ root: classes.treeItem }}
          onClick={() => onItemClick(item.id)}
          nodeId={`${keyPrefix}-${item.id}-properties`}
          label={<div className={classes.filler}>{ icon('fa-datamodel-properties') } properties</div>}
        >
          { itemProperties.map((property: any) => {
            return (
              <SchemaItem
                keyPrefix={`${keyPrefix}-${item.id}-properties`}
                key={`${keyPrefix}-${property.id}`}
                item={property}
                nodeId={`${keyPrefix}-prop-${property.id}`}
                onClick={() => onItemClick(property.id)}
              />
            );
          })
          }
        </TreeItem>
      );
    }
    return null;
  };

  const RenderFields = (itemFields: Field[] | undefined, path: string) => {
    if (itemFields && itemFields.length > 0) {
      return (itemFields.map((field) => {
        if (field.key === 'allOf' || field.key === 'oneOf' || field.key === 'anyOf') {
          return (
            <TreeItem
              classes={{ root: classes.treeItem }}
              nodeId={`${item.id}-${field.key}`}
              className={classes.filler}
              key={`field-${path}-${field.key}`}
              label={<>{ icon('fa-datamodel-element') } {field.key}</>}
              onClick={() => onItemClick(item.id)}
            >
              {field.value.map((e: {$ref: string}) => {
                const el = uiSchema.find((s) => s.id === e.$ref);
                if (el) {
                  return <SchemaItem
                    keyPrefix={`${keyPrefix}-${el.id}`}
                    key={`${keyPrefix}-${el.id}`}
                    refSource={item.$ref}
                    onClick={() => onItemClick(el.id)}
                    item={el}
                    nodeId={`${keyPrefix}-${el.id}-ref`}
                  />;
                }
                return null;
              })}
            </TreeItem>);
        }
        return (
          <TreeItem
            classes={{ root: classes.treeItem }}
            nodeId={`${item.id}-${field.key}`}
            className={classes.filler}
            key={`field-${path}-${field.key}`}
            label={<>{ icon('fa-datamodel-element') } {field.key}: {field.value}</>}
            onClick={() => onItemClick(item.id)}
          />
        );
      })
      );
    }
    return null;
  };

  const RenderRefItems = () => {
    if (refItems && refItems.length > 0) {
      return (
        <SchemaItem
          keyPrefix={`${keyPrefix}-${definitionItem.id}`}
          key={`${keyPrefix}-${definitionItem.id}`}
          refSource={item.$ref}
          onClick={() => onItemClick(definitionItem.id)}
          item={definitionItem}
          nodeId={`${keyPrefix}-${definitionItem.id}-ref`}
        />
      );
    }
    return null;
  };

  const handleCloseContextMenu = (e: React.MouseEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
  };

  const renderLabelText = () => {
    if (refSource) {
      return <>{ icon('fa-datamodel-ref') } {`$ref: ${refSource}`}</>;
    }
    return <>{ icon('fa-datamodel-object') } {item.name ?? item.id.replace('#/definitions/', '')}</>;
  };
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextAnchor(null);
    dispatch(deleteProperty({ path: item.id }));
  };

  const handleAddProperty = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextAnchor(null);
    dispatch(addField({
      path: item.id,
      key: 'key',
      value: 'value',
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
        { item.fields &&
          <MenuItem onClick={handleAddProperty}><i className={`${classes.menuItem} fa fa-plus`}/> Add property</MenuItem>
        }
        <MenuItem><i className='fa fa-clone'/> Import</MenuItem>
        { (item.fields || item.properties || item.$ref) &&
          <MenuItem onClick={handleDeleteClick}><i className='fa fa-trash'/> Delete</MenuItem>
        }
      </Menu>
    </div>
  );
  return (
    <TreeItem
      classes={{ root: classes.treeItem }}
      label={renderLabel()}
      onClick={() => onItemClick(item.id)}
      {...other}
    >
      {RenderRefItems()}
      {RenderProperties(item.properties)}
      {RenderFields(item.fields, item.id)}
    </TreeItem>
  );
}

export default SchemaItem;
