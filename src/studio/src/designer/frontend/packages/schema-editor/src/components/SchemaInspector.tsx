import { IconButton, Input } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { Field, ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { InputField } from './InputField';
import { setFieldValue, setKey, deleteField, setPropertyName, setRef, addField, deleteProperty, setSelectedId } from '../features/editor/schemaEditorSlice';
import { RefSelect } from './RefSelect';
import { getTranslation } from '../utils';

const useStyles = makeStyles(
  createStyles({
    root: {
      minHeight: 600,
      minWidth: 500,
      flexGrow: 1,
      margin: 4,
      padding: 14,
      background: 'white',
      zIndex: 2,
      position: 'fixed',
    },
    label: {
      background: 'white',
      border: '1px solid #006BD8',
      margin: 4,
      padding: 4,
      flexGrow: 1,
    },
    header: {
      padding: 4,
      fontWeight: 400,
      fontSize: 16,
      margin: 2,
    },
    divider: {
      margin: 0,
      padding: '8px 2px 8px 2px',
    },
    navButton: {
      background: 'none',
      border: 'none',
      textDecoration: 'underline',
      cursor: 'pointer',
      color: '#006BD8',
    },
  }),
);

export interface ISchemaInspectorProps {
  onAddPropertyClick: (property: string) => void;
  language: ILanguage;
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
  const referencedItem = useSelector(
    (state: ISchemaState) => state.uiSchema.find((i: UiSchemaItem) => i.id === selectedItem?.$ref),
  );

  const readOnly = selectedItem?.$ref !== undefined;

  // if item is a reference, we want to show the properties of the reference.
  const itemToDisplay = referencedItem ?? selectedItem;

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path,
      value: Number.isNaN(value) ? value : +value,
      key,
    };
    dispatch(setFieldValue(data));
  };
  const onChangeConst = (path: string, value: any) => {
    const data = {
      path,
      value,
      key: 'const',
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
  const onChangPropertyName = (path: string, oldKey: string, newKey: string) => {
    dispatch(setPropertyName({
      path, name: newKey,
    }));
  };
  const onDeleteFieldClick = (path: string, key: string) => {
    dispatch(deleteField({ path, key }));
  };
  const onDeleteObjectClick = (path: string) => {
    dispatch(deleteProperty({ path }));
  };
  const onChangeNodeName = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    dispatch(setPropertyName({
      path: selectedItem?.id, name: e.target.value, navigate: true,
    }));
  };

  const onAddPropertyClicked = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const path = itemToDisplay?.id;
    if (path) {
      props.onAddPropertyClick(path);
    }
  };

  const onAddFieldClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const path = itemToDisplay?.id;
    dispatch(addField({
      path,
      key: 'key',
      value: 'value',
    }));
  };

  const onGoToDefButtonClick = () => {
    dispatch(setSelectedId(
      {
        id: selectedItem?.$ref, readOnly: false, navigate: true,
      },
    ));
  };

  const renderDefUrl = () => {
    if (selectedItem?.$ref) {
      return (
        <div>
          <p className={classes.header}>Refererer til</p>
          <RefSelect
            id={selectedItem.id}
            value={selectedItem.$ref}
            onChange={onChangeRef}
            fullWidth={true}
          />
          <button
            type='button'
            className={classes.navButton}
            onClick={onGoToDefButtonClick}
          >
            {getTranslation('schema_editor.go_to_main_component', props.language)}
          </button>
        </div>);
    }
    return null;
  };

  const renderConst = (p: UiSchemaItem, field: Field) => <InputField
    key={`field-${p.id}`}
    value={field?.value}
    label={p.name ?? p.id}
    readOnly={readOnly}
    fullPath={p.id}
    onChangeValue={onChangeConst}
    onChangeRef={onChangeRef}
    onChangeKey={onChangeKey}
    onDeleteField={onDeleteObjectClick}
  />;

  const renderAddPropertyButtons = () => (
    <>
      <IconButton
        id='add-reference-button'
        aria-label='Add reference'
        onClick={onAddPropertyClicked}
      ><i className='fa fa-plus'/>{getTranslation('schema_editor.create_reference', props.language)}
      </IconButton>
      <IconButton
        id='add-property-button'
        aria-label='Add property'
        onClick={onAddFieldClick}
      ><i className='fa fa-plus'/>{getTranslation('schema_editor.add_property', props.language)}
      </IconButton>
    </>
  );

  const renderItemProperties = (item: UiSchemaItem) => item.properties?.map((p: UiSchemaItem) => {
    const field = p.keywords?.find((f) => f.key === 'const');
    if (field) {
      return renderConst(p, field);
    }

    if (p.$ref) {
      return <InputField
        key={`field-${p.id}`}
        value={p.$ref ?? ''}
        isRef={true}
        readOnly={readOnly}
        label={p.name ?? p.id}
        fullPath={p.id}
        onChangeValue={onChangeValue}
        onChangeRef={onChangeRef}
        onChangeKey={onChangPropertyName}
        onDeleteField={onDeleteObjectClick}
      />;
    }

    return null;
  });

  const renderItemKeywords = (item: UiSchemaItem) => item.keywords?.map((field: Field) => {
    // Keywords - Work in progress, needs sets of rules for different types etc.
    // Need to check for a type field field, and if for example value is "array", "items" are required.

    if (field.key.startsWith('@')) {
      return null;
    }
    return <InputField
      key={`field-${field.key}`}
      isRef={field.key === '$ref'}
      value={field.value.$ref ?? field.value}
      label={field.key}
      readOnly={readOnly}
      fullPath={item.id}
      onChangeValue={onChangeValue}
      onChangeRef={onChangeRef}
      onChangeKey={onChangeKey}
      onDeleteField={onDeleteFieldClick}
    />;
  });

  const renderItem = (item: UiSchemaItem) => (item ?
    <div>
      <p className={classes.header}>{getTranslation('schema_editor.properties', props.language)}</p>
      { renderItemProperties(item) }
      { renderItemKeywords(item) }
      { !readOnly && renderAddPropertyButtons() }
    </div> : null);

  return (
    <div
      className={classes.root}
    >
      <p className={classes.header}>{getTranslation('schema_editor.properties', props.language)}</p>
      { selectedItem &&
      <div>
        <Input
          fullWidth={true}
          disableUnderline={true}
          className={classes.label}
          value={selectedItem.name || selectedItem.id.replace('#/definitions/', '')}
          onChange={onChangeNodeName}
        />
        <hr className={classes.divider} />
        { renderDefUrl() }
        { renderItem(referencedItem ?? selectedItem) }
      </div>
      }
      { !selectedId &&
        <div>
          <p className='no-item-selected'>{getTranslation('schema_editor.no_item_selected', props.language)}</p>
          <hr className={classes.divider} />
        </div>}
    </div>
  );
});

export default SchemaInspector;
