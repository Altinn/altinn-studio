import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { InputField } from './components/InputField';
import { setKey, setValue, addField, addProperty, ISchemaState } from './features/editor/schemaEditorSlice';
import { useDispatch, useSelector } from 'react-redux';

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
    fontSize: '16',
    fontWeight: 'bold',
    paddingRight: 12,
  },
  typeRef: {
    fontSize: 16,
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

function SchemaItem(props: StyledTreeItemProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const {item, ...other} = props;
  let { id, $ref, value, properties } = item;

  const refItem = useSelector((state: ISchemaState) => state.uiSchema.find((i) => i.id === $ref));
  //const propertyItems: any[] = useSelector((state: ISchemaState) => state.uiSchema.filter((i) => properties.find((p: any) => p.id === i.id) !== undefined));

  // React.useEffect(() => {
  //   if (refItem) {
  //     {properties}
  //   }
  // }, [refItem]);
  const onAddPropertyClick = (event: any) => {
    dispatch(addProperty({
      path: id,
      newKey: 'newProp',}));
    event.stopPropagation();
  }

  const onAddFieldClick = (event: any) => {
    dispatch(addField({
      path: id,
      key: 'key',
      value: 'value'
    }));
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

  console.log(`ID: ${id}, ref: `, $ref, refItem)

  return (
    <TreeItem
      label={
        <div className={classes.labelRoot}>
          <Typography className={classes.label} variant='body1'>
            {props.item.name || id}
          </Typography>
          {!refItem && 
          <>
            <Typography className={classes.buttonRoot} variant="button" color="inherit">
            <button className={classes.button} title='Add' onClick={onAddPropertyClick}>Add property</button>
          </Typography>
          <Typography className={classes.buttonRoot} variant="button" color="inherit">
            <button className={classes.button} title='AddSib' onClick={onAddFieldClick}>Add field</button>
          </Typography>
          </>
          }
        </div>
      }
      {...other}
    >
      {refItem && 
        <SchemaItem
          item={refItem}
          nodeId={refItem.id}
        />
      }
      {properties && properties.length > 0 && properties.map((property: any) => {
        return (
          <SchemaItem
            item={property}
            nodeId={property.id}
          />
        )
      })

      }
      {value && Array.isArray(value) && value.map((item: any) => {
        return (
          <InputField
            value={item.value}
            label={item.key}
            fullPath={`${id}`}
            onChangeValue={onChangeValue}
            onChangeKey={onChangeKey}
          />
        );
      })}
    </TreeItem>
  );
}

export default SchemaItem;
