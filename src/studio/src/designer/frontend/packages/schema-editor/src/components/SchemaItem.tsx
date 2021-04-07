/* eslint-disable react/jsx-props-no-spreading */
import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, TextField } from '@material-ui/core';
import { AddCircleOutline, CreateOutlined, DeleteOutline, DoneOutlined } from '@material-ui/icons';
import { deleteProperty,
  setPropertyName,
  setSelectedId } from '../features/editor/schemaEditorSlice';
import { Field, ISchemaState } from '../types';

type StyledTreeItemProps = TreeItemProps & {
  item: any;
  keyPrefix: string;
  // eslint-disable-next-line react/require-default-props
  refSource?: string;
  onAddPropertyClick: (property: any) => void;
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
  field: {
    marginLeft: 30,
    marginBottom: 4,
  },
  iconContainer: {
    background: '#022f51',
    textAlign: 'center',
    padding: '5px 0px 5px 0px',
    marginRight: 4,
    fontSize: '10px',
  },
  treeItem: {
    marginLeft: 6,
  },
});

const getRefItems = (schema: any[], id: string): any[] => {
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

function SchemaItem(props: StyledTreeItemProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {
    item, onAddPropertyClick, refSource, keyPrefix, ...other
  } = props;
  const {
    id, $ref, fields, properties,
  } = item;

  const [definitionItem, setDefinitionItem] = React.useState<any>(item);
  const [editLabel, setEditLabel] = React.useState<boolean>(false);
  const [label, setLabel] = React.useState<string>(item.name || id.replace('#/definitions/', ''));

  const refItems: any[] = useSelector((state: ISchemaState) => getRefItems(state.uiSchema, $ref));

  React.useEffect(() => {
    // if (fields && fields.find((v: any) => v.key === 'const')) {
    //   setConstItem(true);
    // }
    if (refItems && refItems.length > 0) {
      const refItem = refItems[refItems.length - 1];
      setDefinitionItem(refItem);
    }
  }, [fields, refItems]);

  const onAddPropertyClicked = (event: any) => {
    const path = definitionItem?.id || id;
    onAddPropertyClick(path);
    event.preventDefault();
  };

  // const onAddFieldClick = (event: any) => {
  //   const path = definitionItem?.id || id;
  //   dispatch(addField({
  //     path,
  //     key: 'key',
  //     value: 'value',
  //   }));
  //   event.preventDefault();
  // };

  const onDeleteObjectClick = () => {
    dispatch(deleteProperty({ path: id }));
  };

  const onToggleEditLabel = (event: any) => {
    if (editLabel) {
      dispatch(setPropertyName({ path: id, name: label }));
    }
    setEditLabel(!editLabel);
    event.stopPropagation();
  };

  const onClickEditLabel = (event: any) => {
    event.stopPropagation();
  };

  const onChangeLabel = (event: any) => {
    setLabel(event.target.value);
    event.stopPropagation();
  };

  const onItemClick = (itemId: string) => {
    dispatch(setSelectedId({ id: itemId }));
  };
  const icon = (name: string) => <span className={classes.iconContainer}><i className={`fa ${name}`} style={{ color: '#c0cbd3', textAlign: 'center' }} /></span>;

  const RenderProperties = (itemProperties: any[]) => {
    if (itemProperties && itemProperties.length > 0) {
      return (
        <TreeItem
          classes={{ root: classes.treeItem }} nodeId={`${keyPrefix}-${id}-properties`}
          label={<>{ icon('fa-datamodel-properties') } properties</>}
        >
          { itemProperties.map((property: any) => {
            return (
              <SchemaItem
                keyPrefix={`${keyPrefix}-${id}-properties`}
                key={`${keyPrefix}-${property.id}`}
                item={property}
                nodeId={`${keyPrefix}-prop-${property.id}`}
                onAddPropertyClick={props.onAddPropertyClick}
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

  const RenderFields = (itemFields: Field[], path: string) => {
    if (itemFields && itemFields.length > 0) {
      return (itemFields.map((field) => {
        // if (field.key.startsWith('@xsd')) {
        //   return null;
        // }
        // return (
        //   <p className={classes.field} key={`field-${path}-${field.key}`}>{ icon('fa-datamodel-element') }{field.key}: {field.value}</p>
        // );
        return (
          <TreeItem
            nodeId={`${id}-${field.key}`}
            // className={classes.field}
            key={`field-${path}-${field.key}`}
            label={<>{ icon('fa-datamodel-element') }{field.key}: {field.value}</>} 
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
          // label={`$ref: ${$ref}`}
          refSource={$ref}
          onClick={() => onItemClick(definitionItem.id)}
          item={definitionItem}
          nodeId={`${keyPrefix}-${definitionItem.id}-ref`}
          onAddPropertyClick={props.onAddPropertyClick}
        />
      );
    }
    return null;
  };

  const RenderLabel = () => {
    return (
      <div className={classes.labelRoot}>
        {editLabel ?
          <TextField
            className={classes.label}
            value={label}
            onChange={onChangeLabel}
            onClick={onClickEditLabel}
            autoFocus={true}
          />
          :
          <Typography className={classes.label}>
            {refSource ? <>{ icon('fa-datamodel-ref') }{`$ref: ${refSource}`}</> : <>{ icon('fa-datamodel-object') }{item.name ?? id.replace('#/definitions/', '')}</>}
          </Typography>}
        <IconButton onClick={onToggleEditLabel}>
          {editLabel ? <DoneOutlined /> : <CreateOutlined />}
        </IconButton>
        {(definitionItem && definitionItem.properties) &&
        <>
          <IconButton
            aria-label='Add property'
            onClick={onAddPropertyClicked}
          >
            <AddCircleOutline/>
          </IconButton>
        </>
        }
        <IconButton
          aria-label='Delete object'
          onClick={onDeleteObjectClick}
        >
          <DeleteOutline/>
        </IconButton>
      </div>
    );
  };
console.log(other);
  return (
    <TreeItem
      classes={{ root: classes.treeItem }}
      label={<RenderLabel/>}
      {...other}
    >
      {RenderRefItems()}
      {RenderProperties(properties)}
      {RenderFields(fields, id)}
      {/* <Typography
        className={classes.buttonRoot} variant='button'
        color='inherit'
      >
        <button
          type='button'
          className={classes.button} title='AddSib'
          onClick={onAddFieldClick}
        >Add field
        </button>
      </Typography> */}
    </TreeItem>
  );
}

export default SchemaItem;
