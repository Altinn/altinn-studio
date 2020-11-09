import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { InputField } from './InputField';
import { setKey, setValue, addField, addProperty, deleteProperty, ISchemaState, setPropertyName } from '../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import ConstItem from './ConstItem';
import { IconButton, MenuItem, Select, TextField } from '@material-ui/core';
import { AddCircleOutline, CreateOutlined, DeleteOutline, DoneOutlined } from '@material-ui/icons';

declare module 'csstype' {
  interface Properties {
    '--tree-view-color'?: string;
    '--tree-view-bg-color'?: string;
  }
}

type StyledTreeItemProps = TreeItemProps & {
  item: any
};

const useStyles = makeStyles({
  root: {
    height: 216,
    flexGrow: 1,
    maxWidth: 800,
  },
  labelRoot: {
    display: 'flex',
    alignItems: 'left',
    padding: 12,
  },
  label: {
    fontSize: '1.2em',
    paddingRight: 12,
    lineHeight: 2.4,
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
    }
  },
  button: {
    background: 'none',
    border: 'none',
  }
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
}

function SchemaItem(props: StyledTreeItemProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {item, ...other} = props;
  let { id, $ref, value, properties } = item;

  const [constItem, setConstItem] = React.useState<boolean>(false);
  const [itemType, setItemType] = React.useState<string>('');
  const [definitionItem, setDefinitionItem] = React.useState<any>(null);
  const [editLabel, setEditLabel] = React.useState<boolean>(false);
  const [label, setLabel] = React.useState<string>(item.name || id.replace('#/definitions/'));

  const refItems: any[] = useSelector((state: ISchemaState) => getRefItems(state.uiSchema, $ref));

  React.useEffect(() => {
    if (item.value && item.value.find((v: any) => v.key === 'const')) {
      setConstItem(true);
    }
    if (refItems && refItems.length > 0) {
      const refItem = refItems[refItems.length - 1];
      setDefinitionItem(refItem);
      if (refItem.value) {
        setItemType(refItem.value.find((v: any) => v.key === 'type')?.value);
      }
    }
  }, [item, refItems]);

  const onAddPropertyClick = (event: any) => {
    const path = definitionItem?.id || id;
    dispatch(addProperty({
      path,
      newKey: 'newProp',}));
    event.preventDefault();
  }

  const onAddFieldClick = (event: any) => {
    const path = definitionItem?.id || id;
    dispatch(addField({
      path,
      key: 'key',
      value: 'value'
    }));
    event.preventDefault();
  }

  const onDeleteObjectClick = (event: any) => {
    dispatch(deleteProperty({path: id}));
  }

  const onDeleteFieldClick = (event: any) => {
    console.log('DELETE FIELD')
  }

  const onToggleEditLabel = () => {
    if (editLabel) {
      setPropertyName({path: id, name: label});
    }
    setEditLabel(!editLabel);
  }

  const onChangeLabel = (event: any) => {
    setLabel(event.target.value);
    event.preventDefault();
  }

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path, 
      value,
      key,
    }
    dispatch(setValue(data));
  }

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    dispatch(setKey({path, oldKey, newKey}))
  }

  const RenderProperties = (properties: any[]) => {
    if (properties && properties.length > 0)
    {
      return (
        properties.map((property: any) => {
          return (
            <SchemaItem
              item={property}
              nodeId={property.id}
            />
          )
        })
      );
    }
    return null;
  }

  const RenderValue = (value: any[], path: string) => {
    if (value && value.length > 0) {
      return (
        <div>
          {value.map((item) => {
              return (
                <InputField
                  value={item.value}
                  label={item.key}
                  fullPath={path}
                  onChangeValue={onChangeValue}
                  onChangeKey={onChangeKey}
                />
              );
            })
          }
        </div>
        );
    }
    return null;
  }

  const RenderRefItems = () => {
    if (refItems && refItems.length > 0) {
      return (
        <>
          {/* {refItems.map((refItem) => {
            return <Typography>Type: {refItem.id.replace('#/definitions/', '')}</Typography>
          })} */}
          {RenderProperties(definitionItem?.properties)}
          {RenderValue(definitionItem?.value, definitionItem?.id)}
        </>
      )
    }
  }

  const TypeSelect = () => {
    return (
      <Select
        id={`type-select-${item.id}`}
        value={itemType}
      >
        <MenuItem value='string'>string</MenuItem>
        <MenuItem value='integer'>integer</MenuItem>
        <MenuItem value='number'>number</MenuItem>
        <MenuItem value='boolean'>boolean</MenuItem>
        <MenuItem value='array'>array</MenuItem>
        <MenuItem value='enum'>enum</MenuItem>
        <MenuItem value='object'>object</MenuItem>
      </Select>
    )
  }

  const RenderLabel = () => {
    return (
      <div className={classes.labelRoot}>
        {editLabel ?
        <TextField
          className={classes.label}
          value={label}
          onChange={onChangeLabel}
        />
        : <Typography className={classes.label} variant='body1'>
          {props.item.name || id.replace('#/definitions/', '')}
        </Typography>}
        <IconButton onClick={onToggleEditLabel}>
          {editLabel ? <DoneOutlined /> : <CreateOutlined />}
        </IconButton>
        {/* {itemType &&
        <>
          <TypeSelect/>
        </>
        } */}
        {(definitionItem && definitionItem.properties) &&
        <>
          {/* <Typography className={classes.buttonRoot} variant="button" color="inherit">
          <button className={classes.button} title='Add' onClick={onAddPropertyClick}>Add property</button>
        </Typography> */}
          <IconButton
            aria-label='Add property'
            onClick={onAddPropertyClick}
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
  }

  if (constItem) {
    return (
      <TreeItem 
        label={
          <ConstItem item={item}/>
        }
        {...other}
      />
    )
  }

  return (
    <TreeItem
      label={<RenderLabel/>}
      {...other}
    >
      {RenderRefItems()}
      {RenderProperties(properties)}
      {RenderValue(value, id)}
      <Typography className={classes.buttonRoot} variant="button" color="inherit">
        <button className={classes.button} title='AddSib' onClick={onAddFieldClick}>Add field</button>
      </Typography>
    </TreeItem>
  );
}

export default SchemaItem;
