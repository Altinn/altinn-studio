/* eslint-disable react/jsx-props-no-spreading */
import { AppBar, Checkbox, FormControlLabel, Grid, IconButton, TextField } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { Restriction, ILanguage, ISchemaState, ObjectKind, FieldType, UiSchemaItem, CombinationKind } from '../types';
import { InputField } from './InputField';
import { setRestriction, setRestrictionKey, deleteField, setPropertyName, setRef, addRestriction, deleteProperty,
  setTitle, setDescription, setType, setRequired, addProperty, setItems,
  addEnum, deleteEnum, navigateToType, setCombinationType, addCombinationItem, deleteCombinationItem }
  from '../features/editor/schemaEditorSlice';
import { RefSelect } from './RefSelect';
import { getDomFriendlyID, splitParentPathAndName, getTranslation, getUiSchemaItem, combinationIsNullable, nullableType } from '../utils';
import { RestrictionField } from './RestrictionField';
import { EnumField } from './EnumField';
import { SchemaTab } from './SchemaTab';
import InlineObject from './InlineObject';
import { CombinationSelect } from './CombinationSelect';
import { TypeSelect } from './TypeSelect';

const useStyles = makeStyles(
  createStyles({
    root: {
      width: 500,
      padding: 14,
      paddingTop: 8,
      '& .MuiAutocomplete-input': {
        width: 150,
      },
      '& .MuiTabPanel-root > div > div:first-child p': {
        marginTop: 0,
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
    noItem: {
      fontWeight: 500,
      margin: 18,
    },
  }),
);

export interface ISchemaInspectorProps {
  language: ILanguage;
}

export const isValidName = (name: string) => {
  return Boolean(name.match(/^[a-zA-ZæÆøØåÅ][a-zA-Z0-9_.\-æÆøØåÅ ]*$/));
};

const SchemaInspector = ((props: ISchemaInspectorProps) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [nodeName, setNodeName] = React.useState<string>('');
  const [description, setItemDescription] = React.useState<string>('');
  const [title, setItemTitle] = React.useState<string>('');
  const [fieldType, setFieldType] = React.useState<FieldType | undefined>(undefined);
  const [arrayType, setArrayType] = React.useState<FieldType | string | undefined>(undefined);
  const [objectKind, setObjectKind] = React.useState<ObjectKind>('field');
  const [isRequired, setIsRequired] = React.useState<boolean>(false);
  const [nameError, setNameError] = React.useState('');
  const selectedId = useSelector((state: ISchemaState) => ((state.selectedEditorTab === 'properties') ? state.selectedPropertyNodeId : state.selectedDefinitionNodeId));
  const focusName = useSelector((state: ISchemaState) => state.focusNameField);
  const [tabIndex, setTabIndex] = React.useState('0');

  const nameFieldRef = React.useCallback((node: any) => {
    if (node && focusName && focusName === selectedId) {
      setTimeout(() => {
        node.select();
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusName, selectedId]);

  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      return getUiSchemaItem(state.uiSchema, selectedId);
    }
    return null;
  });

  // if item is a reference, we want to show the properties of the reference.
  const itemToDisplay = useSelector(
    (state: ISchemaState) => (selectedItem?.$ref ? state.uiSchema
      .find((i: UiSchemaItem) => i.path === selectedItem.$ref) : selectedItem),
  );

  const parentItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      const [parentPath] = splitParentPathAndName(selectedId);
      if (parentPath) {
        return getUiSchemaItem(state.uiSchema, parentPath);
      }
    }
    return null;
  });

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setFieldType(selectedItem?.type);
    setArrayType(selectedItem?.items?.$ref ?? selectedItem?.items?.type ?? '');
    if (selectedItem) {
      if ((tabIndex === '2' && itemToDisplay?.type !== 'object')) {
        setTabIndex('0');
      }
      setIsRequired(parentItem?.required?.includes(selectedItem?.displayName) ?? false);
      if (selectedItem.$ref !== undefined || selectedItem.items?.$ref !== undefined) {
        setObjectKind('reference');
      } else if (selectedItem.combination) {
        setObjectKind('combination');
      } else {
        setObjectKind('field');
      }
    } else {
      setIsRequired(false);
      setObjectKind('field');
      setTabIndex('0');
    }
  }, [selectedItem, parentItem, tabIndex, itemToDisplay]);

  const readOnly = selectedItem?.$ref !== undefined;

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName ?? '');
  }, [selectedItem]);

  const onChangeValue = (path: string, value: any, key: string) => {
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
    if (oldKey === newKey) {
      return;
    }
    dispatch(setRestrictionKey({
      path, oldKey, newKey,
    }));
  };
  const onChangPropertyName = (path: string, value: string) => {
    dispatch(setPropertyName({
      path, name: value,
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
    if (!nameError && selectedItem && selectedItem?.displayName !== nodeName) {
      dispatch(setPropertyName({
        path: selectedItem.path, name: nodeName, navigate: selectedItem.path,
      }));
    }
  };
  const onChangeEnumValue = (value: string, oldValue?: string) => {
    if (itemToDisplay) {
      dispatch(addEnum({
        path: itemToDisplay.path, value, oldValue,
      }));
    }
  };
  const onChangeCombinationType = (value: CombinationKind) => {
    if (selectedItem?.path) {
      dispatch(setCombinationType({
        path: selectedItem.path, type: value,
      }));
    }
  };

  const onAddPropertyClicked = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    const path = itemToDisplay?.path;
    if (path) {
      dispatch(addProperty({
        path,
        keepSelection: true,
      }));
    }
  };

  const onAddRestrictionClick = (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    if (itemToDisplay) {
      dispatch(addRestriction({
        path: itemToDisplay.path,
        key: '',
        value: '',
      }));
    }
  };

  const onAddEnumButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (itemToDisplay) {
      dispatch(addEnum({
        path: itemToDisplay.path,
        value: 'value',
      }));
    }
  };

  const onGoToDefButtonClick = () => {
    if (!selectedItem?.$ref) {
      return;
    }
    dispatch(navigateToType(
      {
        id: selectedItem?.$ref,
      },
    ));
  };

  const renderReferenceSelection = () => {
    if (selectedItem && objectKind === 'reference') {
      return (
        <div>
          <p className={classes.header}>{getTranslation('reference_to', props.language)}</p>
          {selectedItem.type === 'array' ?
            <RefSelect
              id={selectedItem.path}
              value={arrayType ?? ''}
              onChange={onChangeArrayType}
              fullWidth={true}
            />
            :
            <RefSelect
              id={selectedItem.path}
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
            {getTranslation('go_to_type', props.language)}
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
    ><i className='fa fa-plus' />{getTranslation('add_property', props.language)}
    </IconButton>
  );

  const renderItemProperties = (item: UiSchemaItem) => item.properties?.map((p: UiSchemaItem) => {
    return <InputField
      language={props.language}
      key={p.path}
      required={item.required?.includes(p.displayName)}
      readOnly={readOnly}
      value={p.displayName}
      fullPath={p.path}
      onChangeValue={onChangPropertyName}
      onDeleteField={onDeleteObjectClick}
    />;
  });

  const onRestrictionReturn = (e: any) => {
    onAddRestrictionClick(e);
  };
  const renderItemRestrictions = (item: UiSchemaItem) => item.restrictions?.map((field: Restriction) => {
    if (field.key && field.key.startsWith('@')) {
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
        path={item.path}
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
        path={item.path}
        fullWidth={true}
        value={value}
        onChange={onChangeEnumValue}
        onDelete={onDeleteEnumClick}
      />));
  };

  const handleTabChange = (event: any, newValue: string) => {
    setTabIndex(newValue);
  };

  const onChangeType = (type: FieldType) => {
    if (selectedItem) {
      dispatch(setType({
        path: selectedItem.path, type,
      }));
      setFieldType(type);
    }
  };

  const onChangeArrayType = (type: string | FieldType | undefined) => {
    if (selectedItem) {
      setArrayType(type ?? '');
      let items;
      if (type === undefined) {
        items = undefined;
      } else {
        items = objectKind === 'field' ? { type } : { $ref: type };
      }
      dispatch(setItems({
        path: selectedItem.path, items,
      }));
    }
  };

  const onChangeNullable = (_x: any, nullable: boolean) => {
    if (nullable && selectedItem) {
      dispatch(addCombinationItem({
        path: selectedItem.path,
        props: { type: 'null' },
      }));
    } else {
      const itemToRemove = selectedItem?.combination?.find(nullableType);
      if (itemToRemove) {
        dispatch(deleteCombinationItem({ path: itemToRemove.path }));
      }
    }
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
      onChangeArrayType(type);
      onChangeType('array');
    } else {
      if (objectKind === 'reference') {
        onChangeRef(selectedItem.path, arrayType || '');
      } else {
        onChangeType(arrayType as FieldType);
      }
      onChangeArrayType(undefined);
    }
  };

  const handleRequiredChanged = (e: any, checked: boolean) => {
    if(selectedItem) {
      dispatch(setRequired({
        path: selectedId, key: selectedItem.displayName, required: checked,
      }));
      setIsRequired(checked);
    }
  };

  const onNameChange = (e: any) => {
    const name: string = e.target.value;
    setNodeName(name);
    if (!isValidName(name)) {
      setNameError('Invalid character in name');
    } else {
      setNameError('');
    }
  };

  const renderItemData = () => (
    <div>
      {!selectedItem?.combinationItem &&
        <>
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
        </>
      }
      {selectedItem && objectKind === 'field' &&
        <>
          <p className={classes.header}>{getTranslation('type', props.language)}</p>
          <TypeSelect
            value={(selectedItem.type === 'array') ? arrayType : fieldType}
            id={`${getDomFriendlyID(selectedItem.path)}-type-select`}
            onChange={(selectedItem.type === 'array') ? onChangeArrayType : onChangeType}
            language={props.language}
          />
        </>}
      {renderReferenceSelection()}
      {(objectKind === 'reference' || objectKind === 'field') &&
        <FormControlLabel
          id='multiple-answers-checkbox'
          className={classes.header}
          control={<Checkbox
            color='primary'
            checked={selectedItem?.type === 'array'}
            onChange={handleIsArrayChanged}
            name='checkedMultipleAnswers'
          />}
          label={getTranslation('multiple_answers', props.language)}
        />}
      {objectKind === 'combination' &&
        <>
          <p className={classes.header}>{getTranslation('type', props.language)}</p>
          <CombinationSelect
            value={selectedItem?.combinationKind}
            id={`${getDomFriendlyID(selectedItem?.path || '')}-change-combination`}
            onChange={onChangeCombinationType}
            language={props.language}
          />
        </>
      }
      {objectKind === 'combination' &&
        <FormControlLabel
          id='multiple-answers-checkbox'
          className={classes.header}
          control={<Checkbox
            color='primary'
            checked={combinationIsNullable(selectedItem)}
            onChange={onChangeNullable}
            name='checkedNullable'
          />}
          label={getTranslation('nullable', props.language)}
        />
      }
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
        <p className={classes.noItem} id='no-item-paragraph'>{getTranslation('no_item_selected', props.language)}</p>
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
              hide={objectKind === 'combination' || selectedItem?.combinationItem}
            />
            <SchemaTab
              label='fields'
              language={props.language}
              value='2'
              hide={selectedItem?.type !== 'object' || selectedItem.combinationItem}
            />
          </TabList>

        </AppBar>
        <TabPanel value='0'>
          { (selectedItem?.combinationItem && selectedItem.$ref === undefined) ?
            <InlineObject item={selectedItem} language={props.language}/> :
            renderItemData()
          }
        </TabPanel>
        <TabPanel value='1'>
          <Grid
            container
            spacing={1}
            className={classes.gridContainer}
          >
            <Grid item xs={12}>
              <FormControlLabel
                className={classes.header}
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
            { fieldType !== 'object' &&
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
            {itemToDisplay && renderItemProperties(itemToDisplay)}
          </Grid>
          { !readOnly && renderAddPropertyButton() }
        </TabPanel>
      </TabContext>
    </div>
  );
});

export default SchemaInspector;
