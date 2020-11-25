import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { InputField } from './InputField';
import { setKey,
  setFieldValue,
  addField,
  deleteProperty,
  setPropertyName, 
  deleteField} from '../features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';
import ConstItem from './ConstItem';
import { IconButton, TextField } from '@material-ui/core';
import { AddCircleOutline, CreateOutlined, DeleteOutline, DoneOutlined } from '@material-ui/icons';
import { Field, ISchemaState } from '../types';

type StyledTreeItemProps = TreeItemProps & {
  item: any;
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
    padding: 12,
  },
  label: {
    fontSize: '1.2em',
    paddingRight: 12,
    lineHeight: 2.4,
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
  let { id, $ref, fields, properties } = item;

  const [constItem, setConstItem] = React.useState<boolean>(false);
  const [definitionItem, setDefinitionItem] = React.useState<any>(item);
  const [editLabel, setEditLabel] = React.useState<boolean>(false);
  const [label, setLabel] = React.useState<string>(item.name || id.replace('#/definitions/'));

  const refItems: any[] = useSelector((state: ISchemaState) => getRefItems(state.uiSchema, $ref));

  React.useEffect(() => {
    if (fields  && fields.find((v: any) => v.key === 'const')) {
      setConstItem(true);
    }
    if (refItems && refItems.length > 0) {
      const refItem = refItems[refItems.length - 1];
      setDefinitionItem(refItem);
    }
  }, [fields, refItems]);

  const onAddPropertyClick = (event: any) => {
    const path = definitionItem?.id || id;

    props.onAddPropertyClick(path);

    event.preventDefault();
  };

  const onAddFieldClick = (event: any) => {
    const path = definitionItem?.id || id;
    dispatch(addField({
      path,
      key: 'key',
      value: 'value'
    }));
    event.preventDefault();
  };

  const onDeleteObjectClick = (event: any) => {
    dispatch(deleteProperty({path: id}));
  };

  const onDeleteFieldClick = (path: string, key: string) => {
    dispatch(deleteField({path, key}));
  };

  const onToggleEditLabel = (event: any) => {
    if (editLabel) {
      dispatch(setPropertyName({path: id, name: label}));
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

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path, 
      value: isNaN(value) ? value : +value,
      key,
    }
    dispatch(setFieldValue(data));
  };

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    dispatch(setKey({path, oldKey, newKey}))
  };

  const RenderProperties = (itemProperties: any[]) => {
    if (itemProperties && itemProperties.length > 0)
    {
      return (
        itemProperties.map((property: any) => {
          return (
            <SchemaItem
              key={property.id}
              item={property}
              nodeId={property.id}
              onAddPropertyClick={props.onAddPropertyClick}
            />
          )
        })
      );
    }
    return null;
  };

  const RenderFields = (itemFields: Field[], path: string) => {

    if (itemFields && itemFields.length > 0) {
      return (
        <div>
          {itemFields.map((field) => {
            if (field.key.startsWith('@xsd')) {
              return null;
            }
              return (
                <InputField
                  key={`field-${path}-${field.key}`}
                  value={field.value}
                  label={field.key}
                  fullPath={path}
                  onChangeValue={onChangeValue}
                  onChangeKey={onChangeKey}
                  onDeleteField={onDeleteFieldClick}
                />
              );
            })
          }
        </div>
        );
    }
    return null;
  };

  const RenderRefItems = () => {
    if (refItems && refItems.length > 0) {
      let typeStr = '';
      refItems.forEach((refItem, index) => {
        typeStr = `${typeStr} ${refItem.id.replace('#/definitions/', '')} ${index < refItems.length - 1 ? '-->' : ''}`
      })
      return (
        <>
          <Typography>Type: {typeStr}</Typography>
          {RenderProperties(definitionItem?.properties)}
          {RenderFields(definitionItem?.fields, definitionItem?.id)}
        </>
      )
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
        : <Typography className={classes.label} variant='body1'>
          {props.item.name || id.replace('#/definitions/', '')}
        </Typography>}
        <IconButton onClick={onToggleEditLabel}>
          {editLabel ? <DoneOutlined /> : <CreateOutlined />}
        </IconButton>
        {(definitionItem && definitionItem.properties) &&
        <>
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
  };

  if (constItem || item.value) {
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
      {RenderFields(fields, id)}
      <Typography className={classes.buttonRoot} variant="button" color="inherit">
        <button className={classes.button} title='AddSib' onClick={onAddFieldClick}>Add field</button>
      </Typography>
    </TreeItem>
  );
}

export default SchemaItem;
