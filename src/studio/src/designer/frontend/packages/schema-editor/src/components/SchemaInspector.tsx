/* eslint-disable react/jsx-props-no-spreading */
import { AppBar, IconButton, Tab, TextField } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { Field, ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { InputField } from './InputField';
import { setFieldValue, setKey, deleteField, setPropertyName, setRef, addField, deleteProperty, setSelectedId, setTitle, setDescription } from '../features/editor/schemaEditorSlice';
import { RefSelect } from './RefSelect';
import { getTranslation, getUiSchemaItem } from '../utils';
import { TypeSelect } from './TypeSelect';

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
    field: {
      background: 'white',
      color: 'black',
      border: '1px solid #006BD8',
      boxSsizing: 'border-box',
      '&.Mui-disabled': {
        background: '#f4f4f4',
        color: 'black',
        border: '1px solid #6A6A6A',
        boxSizing: 'border-box',
      },
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
  const [nodeName, setNodeName] = React.useState<string | undefined>('');
  const selectedId = useSelector((state: ISchemaState) => state.selectedId);
  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      return getUiSchemaItem(state.uiSchema, selectedId);
    }
    return null;
  });
  const referencedItem = useSelector(
    (state: ISchemaState) => state.uiSchema.find((i: UiSchemaItem) => i.id === selectedItem?.$ref),
  );

  const readOnly = selectedItem?.$ref !== undefined;
  const typeField = selectedItem?.keywords?.find((k) => k.key === 'type');

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName);
  }, [selectedItem]);

  // if item is a reference, we want to show the properties of the reference.
  const itemToDisplay = referencedItem ?? selectedItem;
  const [tabIndex, setTabIndex] = React.useState('0');

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path,
      // eslint-disable-next-line no-restricted-globals
      value: isNaN(value) ? value : +value,
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
  const onChangeNodeName = () => {
    dispatch(setPropertyName({
      path: selectedItem?.id, name: nodeName, navigate: true,
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
      value: '',
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
    label={p.displayName ?? p.id}
    readOnly={readOnly}
    fullPath={p.id}
    onChangeValue={onChangeConst}
    onChangeRef={onChangeRef}
    onChangeKey={onChangeKey}
    onDeleteField={onDeleteObjectClick}
  />;

  const renderType = (p: UiSchemaItem, field: Field) => <InputField
    key={`field-${p.id}`}
    value={field?.value}
    label={p.displayName ?? p.id}
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
    // render const
    const field = p.keywords?.find((f) => f.key === 'const');
    if (field) {
      return renderConst(p, field);
    }
    // check type
    const type = p.keywords?.find((f) => f.key === 'type');
    if (type) {
      return renderType(p, type);
    }
    if (p.$ref) {
      return <InputField
        key={`field-${p.id}`}
        value={p.$ref ?? ''}
        isRef={true}
        readOnly={readOnly}
        label={p.displayName ?? p.id}
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

  const handleTabChange = (event: any, newValue: string) => {
    setTabIndex(newValue);
  };
  const onChangeType = (id: string, type: string) => {
    console.log(`${id}, ${type}`);
    dispatch(setFieldValue({
      path: id, key: 'type', value: type,
    }));
  };
  const onChangeTitle = (title: string) => {
    dispatch(setTitle({ path: selectedId, title }));
  };
  const onChangeDescription = (description: string) => {
    dispatch(setDescription({ path: selectedId, description }));
  };
  const renderItemData = () => (
    <div>
      <p>Name</p>
      <TextField
        id={`${selectedItem?.id}-name`}
        className={classes.field}
        placeholder='Name'
        label='Name'
        fullWidth={true}
        value={nodeName}
        onChange={(e) => setNodeName(e.target.value)}
        onBlur={onChangeNodeName}
        InputProps={{
          disableUnderline: true,
        }}
      />
      <p>Type</p>
      {selectedId && <TypeSelect
        label='Type'
        fullWidth={true}
        readOnly={readOnly}
        itemType={typeField?.value}
        id={selectedId}
        onChange={onChangeType}
      />}
      { renderDefUrl() }
      <hr className={classes.divider} />
      <p>Beskrivende felter</p>
      <TextField
        id={`${selectedItem?.id}-title`}
        className={classes.field}
        label='Title'
        placeholder='Title'
        fullWidth
        value={selectedItem?.title ?? ''}
        margin='normal'
        onChange={(e) => onChangeTitle(e.target.value)}
        InputProps={{
          disableUnderline: true,
        }}
      />

      <TextField
        id={`${selectedItem?.id}-description`}
        multiline={true}
        className={classes.field}
        label='Description'
        fullWidth
        style={{ height: 100 }}
        value={selectedItem?.description ?? ''}
        margin='normal'
        onChange={(e) => onChangeDescription(e.target.value)}
        InputLabelProps={{
          shrink: true,
        }}
        InputProps={{
          disableUnderline: true,
        }}
      />
    </div>);

  const renderItemFields = (item: UiSchemaItem) => (item ?
    <div>
      { renderItemProperties(item) }
      { renderItemKeywords(item) }
      { !readOnly && renderAddPropertyButtons() }
    </div> : null);

  const a11yProps = (index: number) => ({
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
    value: `${index}`,
  });

  if (!selectedId) {
    return (
      <div>
        <p className='no-item-selected'>{getTranslation('schema_editor.no_item_selected', props.language)}</p>
        <hr className={classes.divider} />
      </div>);
  }

  return (
    <div
      className={classes.root}
    >
      <TabContext value={tabIndex}>
        <AppBar position='static' color='default'>
          <TabList
            onChange={handleTabChange}
            aria-label='inspector tabs'
          >
            <Tab
              label={getTranslation('schema_editor.properties', props.language)} {...a11yProps(0)}
            />
            <Tab
              label={getTranslation('schema_editor.restrictions', props.language)} {...a11yProps(1)}
            />
            <Tab
              label={getTranslation('schema_editor.fields', props.language)} {...a11yProps(2)}
            />
          </TabList>

        </AppBar>
        <TabPanel value='0'>
          { renderItemData() }
        </TabPanel>
        <TabPanel value='1'>
          ...
        </TabPanel>
        <TabPanel value='2'>
          { selectedItem && renderItemFields(referencedItem ?? selectedItem) }
        </TabPanel>
      </TabContext>
    </div>
  );
});

export default SchemaInspector;
