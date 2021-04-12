import { Card, CardContent, CardHeader } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Field, ISchemaState } from '../types';
import { InputField } from './InputField';
import { setFieldValue, setKey, deleteField } from '../features/editor/schemaEditorSlice';

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 600,
      minWidth: 300,
      flexGrow: 1,
      margin: 4,
      padding: 2,
      position: 'fixed',
    },
  }),
);

export interface ISchemaInspector {
}

const SchemaInspector = (() => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const selectedId = useSelector((state: ISchemaState) => state.selectedId);
  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      if (selectedId.includes('/properties/')) {
        const item = state.uiSchema.find((i) => i.properties?.find((e) => e.id === selectedId));
        return item?.properties?.find((p) => p.id === selectedId);
      }
      return state.uiSchema.find((i) => i.id === selectedId);
    }
    return null;
  });

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path,
      value,
      key,
    };
    dispatch(setFieldValue(data));
  };

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    dispatch(setKey({
      path, oldKey, newKey,
    }));
  };
  const onDeleteFieldClick = (path: string, key: string) => {
    dispatch(deleteField({ path, key }));
  };

  const RenderSelectedItem = () => (selectedItem ?
    <div>
      <table>
        <tbody>
          <tr>
            <td>id</td>
            <td>{selectedId}</td>
          </tr>
          <tr><td><h3>Properties</h3></td></tr>
          { selectedItem.properties?.map((f) => <tr key={f.id}><td>{f.name}</td><td>{f.$ref}</td></tr>)}
        </tbody>
      </table>
      { selectedItem.fields?.map((field: Field) => <InputField
        key={`field-${field.key}`}
        value={field.value}
        label={field.key}
        fullPath={selectedItem.id}
        onChangeValue={onChangeValue}
        onChangeKey={onChangeKey}
        onDeleteField={onDeleteFieldClick}
      />)}
    </div> : null);

  return (
    <Card
      elevation={1}
      className={classes.root}
    >
      <CardHeader title='Inspector' />
      <CardContent>
        { selectedId && RenderSelectedItem() }
        { !selectedId && <p className='no-item-selected'>No item selected</p>}
      </CardContent>
    </Card>
  );
});

export default SchemaInspector;
