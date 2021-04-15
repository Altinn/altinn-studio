import { IconButton, Input } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Field, ISchemaState, UiSchemaItem } from '../types';
import { InputField } from './InputField';
import { setFieldValue, setKey, deleteField, setPropertyName, setRef, addField, deleteProperty } from '../features/editor/schemaEditorSlice';

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 600,
      minWidth: 300,
      flexGrow: 1,
      margin: 4,
      padding: 2,
      background: 'white',
      zIndex: 2,
      position: 'fixed',
    },
    label: {
      background: 'white',
      border: '1px solid #006BD8',
      padding: 4,
      flexGrow: 1,
    },
    header: {
      padding: 8,
    },
  }),
);

export interface ISchemaInspectorProps {
  onAddPropertyClick: (property: any) => void;
}

const SchemaInspector = ((props: ISchemaInspectorProps) => {
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
  const onChangeRef = (path: string, ref: string) => {
    const data = {
      path,
      ref,
    };
    dispatch(setRef(data));
  };

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    dispatch(setKey({
      path, oldKey, newKey,
    }));
  };
  const onDeleteFieldClick = (path: string, key: string) => {
    dispatch(deleteField({ path, key }));
  };
  const onDeleteObjectClick = (path: string) => {
    dispatch(deleteProperty({ path }));
  };
  const onChangeNodeName = (e: any) => {
    dispatch(setPropertyName({ path: selectedItem?.id, name: e.target.value }));
  };

  const onAddPropertyClicked = (event: any) => {
    event.preventDefault();
    const path = selectedItem?.id;
    props.onAddPropertyClick(path);
  };
  const onAddFieldClick = (event: any) => {
    event.preventDefault();
    const path = selectedItem?.id;
    dispatch(addField({
      path,
      key: 'key',
      value: 'value',
    }));
  };

  const RenderSelectedItem = () => (selectedItem ?
    <div>
      <p>Nodenavn</p>
      <Input
        fullWidth={true}
        disableUnderline={true}
        className={classes.label}
        value={selectedItem.name || selectedItem.id.replace('#/definitions/', '')}
        onChange={onChangeNodeName}
      />
      <hr />
      <h3 className={classes.header}>Properties</h3>
      {/* These are the refs or consts */}
      { selectedItem.properties?.map((p: UiSchemaItem) => <InputField
        key={`field-${p.id}`}
        value={p.$ref ?? ''}
        isRef={p.$ref !== undefined}
        label={p.name ?? p.id}
        fullPath={p.id}
        onChangeValue={onChangeValue}
        onChangeRef={onChangeRef}
        onChangeKey={onChangeKey}
        onDeleteField={onDeleteObjectClick}
      />)}

      {/* Normal fields  */}
      { selectedItem.fields?.map((field: Field) => <InputField
        key={`field-${field.key}`}
        value={field.value}
        label={field.key}
        fullPath={selectedItem.id}
        onChangeValue={onChangeValue}
        onChangeRef={onChangeRef}
        onChangeKey={onChangeKey}
        onDeleteField={onDeleteFieldClick}
      />)}
      { selectedItem.properties &&
      <IconButton
        aria-label='Add property'
        onClick={onAddPropertyClicked}
      ><i className='fa fa-plus'/>Add property
      </IconButton> }
      { selectedItem.fields &&
      <IconButton
        aria-label='Add property'
        onClick={onAddFieldClick}
      ><i className='fa fa-plus'/>Add property
      </IconButton> }
    </div> : null);

  return (
    <div
      className={classes.root}
    >
      { selectedItem && RenderSelectedItem() }
      { !selectedId &&
        <div>
          <p className='no-item-selected'>No item selected</p>
          <hr />
        </div>}
    </div>
  );
});

export default SchemaInspector;
