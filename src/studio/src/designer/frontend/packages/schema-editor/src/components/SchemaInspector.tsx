/* eslint-disable react/jsx-props-no-spreading */
import { AppBar, Checkbox, FormControlLabel, Grid, IconButton, MenuItem, Select, TextField } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { Field, ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { InputField } from './InputField';
import { setRestriction, setKey, deleteField, setPropertyName, setRef, addRestriction, deleteProperty,
  setSelectedId, setTitle, setDescription, setType, setRequired, addProperty, setItems,
  addEnum, deleteEnum }
  from '../features/editor/schemaEditorSlice';
import { RefSelect } from './RefSelect';
import { getDomFriendlyID, getParentPath, getTranslation, getUiSchemaItem } from '../utils';
import { TypeSelect } from './TypeSelect';
import { RestrictionField } from './RestrictionField';
import { EnumField } from './EnumField';
import { SchemaTab } from './SchemaTab';

const useStyles = makeStyles(
  createStyles({
    root: {
      minHeight: 600,
      minWidth: 500,
      flexGrow: 1,
      padding: 14,
      background: 'white',
      zIndex: 2,
      position: 'fixed',
      '& .MuiAutocomplete-input': {
        width: 150,
      },
    },
    header: {
      padding: 0,
      fontWeight: 400,
      fontSize: 16,
      marginTop: 24,
      marginBottom: 6,
      '& .Mui-focusVisible': {
        background: 'gray',
      },
    },
    name: {
      marginBottom: 6,
      padding: 0,
      fontWeight: 400,
      fontSize: 16,
    },
    divider: {
      marginTop: 2,
      marginBottom: 2,
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
      marginTop: 2,
      padding: 4,
      '&.Mui-disabled': {
        background: '#f4f4f4',
        color: 'black',
        border: '1px solid #6A6A6A',
        boxSizing: 'border-box',
      },
    },
    appBar: {
      border: 'none',
      boxShadow: 'none',
      backgroundColor: '#fff',
      color: '#000',
      '& .Mui-Selected': {
        color: '#6A6A6A',
      },
      '& .MuiTabs-indicator': {
        backgroundColor: '#006BD8',
      },
    },
    gridContainer: {
      maxWidth: 500,
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
  const [nodeName, setNodeName] = React.useState<string>('');
  const [description, setItemDescription] = React.useState<string>('');
  const [title, setItemTitle] = React.useState<string>('');
  const [objectType, setObjectType] = React.useState<string>('');
  const [arrayType, setArrayType] = React.useState<string>('');
  const [objectKind, setObjectKind] = React.useState<'type' | 'reference' | 'group'>('type');
  const [isRequired, setIsRequired] = React.useState<boolean>(false);
  const [nameError, setNameError] = React.useState('');
  const selectedId = useSelector((state: ISchemaState) => state.selectedId);
  const focusName = useSelector((state: ISchemaState) => state.focusNameField);
  const [tabIndex, setTabIndex] = React.useState('0');

  const nameFieldRef = React.useCallback((node: any) => {
    if (node && focusName) {
      node.focus();
      node.select();
    }
  }, [focusName]);
  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      return getUiSchemaItem(state.uiSchema, selectedId);
    }
    return null;
  });

  // if item is a reference, we want to show the properties of the reference.
  const itemToDisplay = useSelector(
    (state: ISchemaState) => (selectedItem?.$ref ? state.uiSchema
      .find((i: UiSchemaItem) => i.id === selectedItem.$ref) : selectedItem),
  );

  const parentItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      const parentPath = getParentPath(selectedId);
      if (parentPath != null) {
        return getUiSchemaItem(state.uiSchema, parentPath);
      }
    }
    return null;
  });

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setObjectType(selectedItem?.type ?? '');
    setArrayType(selectedItem?.items?.$ref ?? selectedItem?.items?.type ?? '');
    if (selectedItem) {
      if ((tabIndex === '2' && itemToDisplay?.type !== 'object')) {
        setTabIndex('0');
      }
      setIsRequired(parentItem?.required?.includes(selectedItem?.displayName) ?? false);
      if (selectedItem.$ref !== undefined || selectedItem.items?.$ref !== undefined) {
        setObjectKind('reference');
      } else {
        setObjectKind('type');
      }
    } else {
      setIsRequired(false);
      setObjectKind('type');
      setTabIndex('0');
    }
  }, [selectedItem, parentItem, tabIndex, itemToDisplay]);

  const readOnly = selectedItem?.$ref !== undefined;

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
  }, [selectedItem]);

  const onChangeValue = (path: string, value: any, key?: string) => {
    const data = {
      path,
      // eslint-disable-next-line no-restricted-globals
      value: isNaN(value) ? value : +value,
      key,
    };
    dispatch(setRestriction(data));
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
  const onDeleteEnumClick = (path: string, value: string) => {
    dispatch(deleteEnum({ path, value }));
  };
  const onChangeNodeName = () => {
    dispatch(setPropertyName({
      path: selectedItem?.id, name: nodeName, navigate: selectedItem?.id,
    }));
  };
  const onChangeEnumValue = (value: string, oldValue?: string) => {
    dispatch(addEnum({
      path: itemToDisplay?.id, value, oldValue,
    }));
  };

  const onAddPropertyClicked = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    const path = itemToDisplay?.id;
    if (path) {
      dispatch(addProperty({
        path,
        keepSelection: true,
      }));
    }
  };

  const onAddRestrictionClick = (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    const path = itemToDisplay?.id;
    dispatch(addRestriction({
      path,
      key: '',
      value: '',
    }));
  };
  const onAddEnumButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const path = itemToDisplay?.id;
    dispatch(addEnum({
      path,
      value: 'value',
    }));
  };

  const onGoToDefButtonClick = () => {
    dispatch(setSelectedId(
      {
        id: selectedItem?.$ref, readOnly: false, navigate: selectedItem?.id,
      },
    ));
  };

  const renderReferenceSelection = () => {
    if (selectedItem && objectKind === 'reference') {
      return (
        <div>
          <p className={classes.header}>Refererer til</p>
          { selectedItem.type === 'array' ?
            <RefSelect
              id={selectedItem.id}
              value={arrayType ?? ''}
              onChange={onChangeArrayType}
              fullWidth={true}
            />
            :
            <RefSelect
              id={selectedItem.id}
              value={selectedItem.$ref ?? ''}
              onChange={onChangeRef}
              fullWidth={true}
            />
          }
          <button
            type='button'
            className={classes.navButton}
            onClick={onGoToDefButtonClick}
          >
            {getTranslation('go_to_main_component', props.language)}
          </button>
        </div>);
    }
    return null;
  };

  const renderAddPropertyButton = () => (
    <IconButton
      id='add-property-button'
      aria-label='Add reference'
      onClick={onAddPropertyClicked}
    ><i className='fa fa-plus'/>{getTranslation('add_property', props.language)}
    </IconButton>
  );

  const renderItemProperties = (item: UiSchemaItem) => item.properties?.map((p: UiSchemaItem) => {
    return <InputField
      language={props.language}
      key={`field-${p.id}`}
      required={item.required?.includes(p.displayName)}
      readOnly={readOnly}
      label={p.displayName}
      fullPath={p.id}
      onChangeKey={onChangPropertyName}
      onDeleteField={onDeleteObjectClick}
    />;
  });

  const onRestrictionReturn = (e: any) => {
    onAddRestrictionClick(e);
  };
  const renderItemRestrictions = (item: UiSchemaItem) => item.restrictions?.map((field: Field) => {
    if (!field.key && field.key.startsWith('@')) {
      return null;
    }
    return (
      <RestrictionField
        key={field.key}
        language={props.language}
        type={itemToDisplay?.type}
        value={field.value}
        keyName={field.key}
        readOnly={readOnly}
        path={item.id}
        onChangeValue={onChangeValue}
        onChangeKey={onChangeKey}
        onDeleteField={onDeleteFieldClick}
        onReturn={onRestrictionReturn}
      />
    );
  });

  const renderEnums = (item: UiSchemaItem) => {
    return item.enum?.map((value: string) => (
      <EnumField
        key={value}
        language={props.language}
        path={item.id}
        fullWidth={true}
        value={value}
        onChange={onChangeEnumValue}
        onDelete={onDeleteEnumClick}
      />));
  };

  const handleTabChange = (event: any, newValue: string) => {
    setTabIndex(newValue);
  };

  const onChangeType = (id: string, type: string) => {
    dispatch(setType({
      path: id, value: type,
    }));
    setObjectType(type);
  };

  const onChangeArrayType = (id: string, type: string | undefined) => {
    setArrayType(type ?? '');
    let items = null;
    if (type === undefined) {
      items = undefined;
    } else {
      items = objectKind === 'type' ? { type } : { $ref: type };
    }
    dispatch(setItems({
      path: id, items,
    }));
  };

  const onChangeTitle = () => {
    dispatch(setTitle({ path: selectedId, title }));
  };

  const onChangeDescription = () => {
    dispatch(setDescription({ path: selectedId, description }));
  };

  const handleIsArrayChanged = (e: any, checked: boolean) => {
    if (!selectedItem) {
      return;
    }

    if (checked) {
      const type = objectKind === 'reference' ? selectedItem.$ref : selectedItem.type;
      onChangeArrayType(selectedItem.id, type);
      onChangeType(selectedItem.id, 'array');
    } else {
      if (objectKind === 'reference') {
        onChangeRef(selectedItem.id, arrayType);
      } else {
        onChangeType(selectedItem.id, arrayType);
      }
      onChangeArrayType(selectedItem.id, undefined);
    }
  };

  const handleRequiredChanged = (e: any, checked: boolean) => {
    dispatch(setRequired({
      path: selectedId, key: selectedItem?.displayName, required: checked,
    }));
    setIsRequired(checked);
  };

  const onChangeObjectKind = (e: any) => {
    setObjectKind(e.target.value);
  };
  const onNameChange = (e: any) => {
    const name: string = e.target.value;
    setNodeName(name);
    if (!name.match(/^[a-z][a-zA-Z0-9_.\-æÆøØåÅ ]*$/)) {
      setNameError('Invalid character in name');
    } else {
      setNameError('');
    }
  };
  const renderItemData = () => (
    <div>
      <p className={classes.name}>{getTranslation('name', props.language)}</p>
      <TextField
        id='selectedItemName'
        className={classes.field}
        inputRef={nameFieldRef}
        placeholder='Name'
        fullWidth={true}
        value={nodeName}
        error={!!nameError}
        helperText={nameError}
        onChange={onNameChange}
        onBlur={onChangeNodeName}
        InputProps={{
          disableUnderline: true,
        }}
      />
      <p className={classes.header}>{getTranslation('object_kind_label', props.language)}</p>
      <Select
        className={classes.field}
        id='type-kind-select'
        value={objectKind}
        onChange={onChangeObjectKind}
        disableUnderline={true}
        fullWidth={true}
      >
        <MenuItem value='type'>{getTranslation('type', props.language)}</MenuItem>
        <MenuItem value='reference'>{getTranslation('reference', props.language)}</MenuItem>
        <MenuItem value='group'>{getTranslation('group', props.language)}</MenuItem>
      </Select>
      {selectedItem && objectKind === 'type' &&
      <>
        <p className={classes.header}>Type</p>
        { selectedItem.type === 'array' ?
          <TypeSelect
            label='Type'
            language={props.language}
            fullWidth={true}
            value={arrayType}
            id={selectedItem.id}
            onChange={onChangeArrayType}
          /> :
          <TypeSelect
            label='Type'
            language={props.language}
            fullWidth={true}
            value={objectType}
            id={selectedItem.id}
            onChange={(onChangeType)}
          /> }
      </>}
      { renderReferenceSelection() }
      <FormControlLabel
        id='multiple-answers-checkbox'
        className={classes.header}
        control={<Checkbox
          checked={selectedItem?.type === 'array'}
          onChange={handleIsArrayChanged}
          name='checkedMultipleAnswers'
        />}
        label={getTranslation('multiple_answers', props.language)}
      />
      <hr className={classes.divider} />
      <p className={classes.header}>{getTranslation('descriptive_fields', props.language)}</p>
      <p className={classes.header}>{getTranslation('title', props.language)}</p>
      <TextField
        id={`${getDomFriendlyID(selectedId ?? '')}-title`}
        className={classes.field}
        fullWidth
        value={title}
        margin='normal'
        onChange={(e) => setItemTitle(e.target.value)}
        onBlur={onChangeTitle}
        InputProps={{
          disableUnderline: true,
        }}
      />
      <p className={classes.header}>{getTranslation('description', props.language)}</p>
      <TextField
        id={`${getDomFriendlyID(selectedId ?? '')}-description`}
        multiline={true}
        className={classes.field}
        fullWidth
        style={{ height: 100 }}
        value={description}
        margin='normal'
        onChange={(e) => setItemDescription(e.target.value)}
        onBlur={onChangeDescription}
        InputProps={{
          disableUnderline: true,
        }}
      />
    </div>);

  if (!selectedId) {
    return (
      <div>
        <p className='no-item-selected'>{getTranslation('no_item_selected', props.language)}</p>
        <hr className={classes.divider} />
      </div>);
  }

  return (
    <div
      className={classes.root}
    >
      <TabContext value={tabIndex}>
        <AppBar
          position='static' color='default'
          className={classes.appBar}
        >
          <TabList
            onChange={handleTabChange}
            aria-label='inspector tabs'
          >
            <SchemaTab
              label='properties'
              language={props.language}
              value='0'
            />
            <SchemaTab
              label='restrictions'
              language={props.language}
              value='1'
            />
            <SchemaTab
              label='fields'
              language={props.language}
              value='2'
              hide={itemToDisplay?.type !== 'object'}
            />
          </TabList>

        </AppBar>
        <TabPanel value='0'>
          { renderItemData() }
        </TabPanel>
        <TabPanel value='1'>
          <Grid
            container
            spacing={1}
            className={classes.gridContainer}
          >
            <Grid item xs={12}>
              <FormControlLabel
                control={<Checkbox
                  checked={isRequired} onChange={handleRequiredChanged}
                  name='checkedRequired'
                />}
                label={getTranslation('required', props.language)}
              />
            </Grid>
            <Grid item xs={12}>
              <hr className={classes.divider} />
            </Grid>
            <Grid item xs={4}>
              <p>{getTranslation('keyword', props.language)}</p>
            </Grid>
            <Grid item xs={1} />
            <Grid item xs={7}>
              <p>{getTranslation('value', props.language)}</p>
            </Grid>
            { itemToDisplay && renderItemRestrictions(itemToDisplay) }
            <IconButton
              id='add-restriction-button'
              aria-label={getTranslation('add_restriction', props.language)}
              onClick={onAddRestrictionClick}
            ><i className='fa fa-plus'/>{getTranslation('add_restriction', props.language)}
            </IconButton>
            { objectType !== 'object' &&
              <>
                <Grid item xs={12}>
                  <hr className={classes.divider} />
                  <p className={classes.header}>{getTranslation('enum', props.language)}</p>
                </Grid>
                {itemToDisplay && renderEnums(itemToDisplay)}
                <IconButton
                  id='add-enum-button'
                  aria-label={getTranslation('add_enum', props.language)}
                  onClick={onAddEnumButtonClick}
                ><i className='fa fa-plus'/>{getTranslation('add_enum', props.language)}
                </IconButton>
              </>}
          </Grid>
        </TabPanel>
        <TabPanel value='2'>
          <Grid
            container
            spacing={3}
            className={classes.gridContainer}
          >
            { itemToDisplay && renderItemProperties(itemToDisplay) }
          </Grid>
          { !readOnly && renderAddPropertyButton() }
        </TabPanel>
      </TabContext>
    </div>
  );
});

export default SchemaInspector;
