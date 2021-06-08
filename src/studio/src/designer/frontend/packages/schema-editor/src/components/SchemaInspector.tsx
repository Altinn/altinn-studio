/* eslint-disable react/jsx-props-no-spreading */
import { AppBar, Checkbox, FormControlLabel, Grid, IconButton, Tab, TextField } from '@material-ui/core';
import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { Field, ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { InputField } from './InputField';
import { setFieldValue, setKey, deleteField, setPropertyName, setRef, addRestriction, deleteProperty, setSelectedId, setTitle, setDescription, setType, setRequired, addProperty } from '../features/editor/schemaEditorSlice';
import { RefSelect } from './RefSelect';
import { getDomFriendlyID, getParentPath, getTranslation, getUiSchemaItem } from '../utils';
import { TypeSelect } from './TypeSelect';
import { RestrictionField } from './RestrictionField';

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
      '& .MuiAutocomplete-input': {
        width: 150,
      },
    },
    label: {
      margin: '4px 0px 0px 0px',
      padding: 0,
    },
    header: {
      padding: 4,
      fontWeight: 400,
      fontSize: 16,
      marginTop: 2,
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
    restrictions: {
      flexGrow: 1,
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
  const [description, setItemDescription] = React.useState<string>('');
  const [title, setItemTitle] = React.useState<string>('');
  const [objectType, setObjectType] = React.useState<string>('');
  const [isRequired, setIsRequired] = React.useState<boolean>(false);
  const selectedId = useSelector((state: ISchemaState) => state.selectedId);
  const referencedItem = useSelector(
    (state: ISchemaState) => state.uiSchema.find((i: UiSchemaItem) => i.id === selectedItem?.$ref),
  );
  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      return getUiSchemaItem(state.uiSchema, selectedId);
    }
    return null;
  });

  const parentItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      const parentPath = getParentPath(selectedId);
      if (parentPath != null) {
        return getUiSchemaItem(state.uiSchema, parentPath);
      }
    }
    return null;
  });
  const isArray = false;

  React.useEffect(() => {
    setNodeName(selectedItem?.displayName);
    setItemTitle(selectedItem?.title ?? '');
    setItemDescription(selectedItem?.description ?? '');
    setObjectType(selectedItem?.type ?? '');
    if (selectedItem) {
      setIsRequired(parentItem?.required?.includes(selectedItem?.displayName) ?? false);
    } else {
      setIsRequired(false);
    }
  }, [selectedItem, parentItem]);

  const readOnly = selectedItem?.$ref !== undefined;

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
      // props.onAddPropertyClick(path);
      dispatch(addProperty({
        path,
      }));
    }
  };

  const onAddRestrictionClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const path = itemToDisplay?.id;
    dispatch(addRestriction({
      path,
      key: '',
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
    language={props.language}
    label={p.displayName ?? p.id}
    readOnly={readOnly}
    fullPath={p.id}
    onChangeValue={onChangeConst}
    onChangeRef={onChangeRef}
    onChangeKey={onChangeKey}
    onDeleteField={onDeleteObjectClick}
  />;

  const renderAddPropertyButton = () => (
    <IconButton
      id='add-reference-button'
      aria-label='Add reference'
      onClick={onAddPropertyClicked}
    ><i className='fa fa-plus'/>{getTranslation('schema_editor.add_property', props.language)}
    </IconButton>
  );

  const renderItemProperties = (item: UiSchemaItem) => item.properties?.map((p: UiSchemaItem) => {
    // render names, restricted checkboxes and delete buttons
    const field = p.restrictions?.find((f) => f.key === 'const');
    if (field) {
      return renderConst(p, field);
    }
    if (p.$ref) {
      return <InputField
        language={props.language}
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

    return <InputField
      language={props.language}
      key={`field-${p.id}`}
      value={p.value}
      readOnly={readOnly}
      label={p.displayName ?? p.id}
      fullPath={p.id}
      onChangeValue={onChangeValue}
      onChangeRef={onChangeRef}
      onChangeKey={onChangPropertyName}
      onDeleteField={onDeleteObjectClick}
    />;
  });

  const renderItemRestrictions = (item: UiSchemaItem) => item.restrictions?.map((field: Field) => {
    // Keywords - Work in progress, needs sets of rules for different types etc.
    // Need to check for a type field field, and if for example value is "array", "items" are required.

    if (field.key.startsWith('@')) {
      return null;
    }
    return (
      <Grid
        item xs={12}
        key={field.key}
      >
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
        />
      </Grid>);
  });

  const handleTabChange = (event: any, newValue: string) => {
    setTabIndex(newValue);
  };
  const onChangeType = (id: string, type: string) => {
    dispatch(setType({
      path: id, value: type,
    }));
    setObjectType(type);
  };
  const onChangeTitle = () => {
    dispatch(setTitle({ path: selectedId, title }));
  };
  const onChangeDescription = () => {
    dispatch(setDescription({ path: selectedId, description }));
  };
  const handleIsArrayChanged = (e: any) => {
    console.log(e);
  };

  const handleRequiredChanged = (e: any, checked: boolean) => {
    dispatch(setRequired({
      path: selectedId, key: selectedItem?.displayName, required: checked,
    }));
    setIsRequired(checked);
  };

  const renderItemData = () => (
    <div>
      <p className={classes.label}>{getTranslation('schema_editor.name', props.language)}</p>
      <TextField
        id={`${getDomFriendlyID(selectedId ?? '')}-name`}
        className={classes.field}
        placeholder='Name'
        fullWidth={true}
        value={nodeName}
        onChange={(e) => setNodeName(e.target.value)}
        onBlur={onChangeNodeName}
        InputProps={{
          disableUnderline: true,
        }}
      />
      <p className={classes.label}>Type</p>
      {selectedItem && <TypeSelect
        label='Type'
        language={props.language}
        fullWidth={true}
        readOnly={readOnly}
        value={objectType}
        id={selectedItem.id}
        onChange={(onChangeType)}
      />}
      { renderDefUrl() }
      <FormControlLabel
        control={<Checkbox
          checked={isArray} onChange={handleIsArrayChanged}
          name='checkedArray'
        />}
        label={getTranslation('schema_editor.multiple_answers', props.language)}
      />
      <hr className={classes.divider} />
      <p className={classes.label}>{getTranslation('schema_editor.descriptive_fields', props.language)}</p>
      <p className={classes.label}>{getTranslation('schema_editor.title', props.language)}</p>
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
      <p className={classes.label}>{getTranslation('schema_editor.description', props.language)}</p>
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
        <AppBar
          position='static' color='default'
          className={classes.appBar}
        >
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
              hidden={itemToDisplay?.type !== 'object'}
              label={getTranslation('schema_editor.fields', props.language)} {...a11yProps(2)}
            />
          </TabList>

        </AppBar>
        <TabPanel value='0'>
          { renderItemData() }
        </TabPanel>
        <TabPanel value='1'>
          <div className={classes.restrictions}>
            <Grid container>
              <Grid item xs={4}>
                <FormControlLabel
                  control={<Checkbox
                    checked={isRequired} onChange={handleRequiredChanged}
                    name='checkedRequired'
                  />}
                  label={getTranslation('schema_editor.required', props.language)}
                />
              </Grid>
              <Grid item xs={1} />
              <Grid item xs={7} />
              <Grid item xs={12}>
                <hr className={classes.divider} />
              </Grid>
              <Grid item xs={4}>
                <p>Nøkkelord</p>
              </Grid>
              <Grid item xs={1} />
              <Grid item xs={7}>
                <p>Verdi</p>
              </Grid>
              { itemToDisplay && renderItemRestrictions(itemToDisplay) }
            </Grid>
          </div>
          <IconButton
            id='add-restriction-button'
            aria-label='Add property'
            onClick={onAddRestrictionClick}
          ><i className='fa fa-plus'/>{getTranslation('schema_editor.add_restriction', props.language)}
          </IconButton>
        </TabPanel>
        <TabPanel value='2'>
          { itemToDisplay && renderItemProperties(itemToDisplay) }
          { !readOnly && renderAddPropertyButton() }
        </TabPanel>
      </TabContext>
    </div>
  );
});

export default SchemaInspector;
