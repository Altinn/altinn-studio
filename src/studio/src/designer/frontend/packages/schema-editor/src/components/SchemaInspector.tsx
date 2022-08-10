import {
  AppBar,
  Checkbox,
  FormControlLabel,
  Grid,
  IconButton,
} from '@material-ui/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import type {
  Restriction,
  ILanguage,
  ISchemaState,
  UiSchemaItem,
} from '../types';
import { ObjectKind } from '../types/enums';
import { PropertyItem } from './PropertyItem';
import {
  setRestriction,
  setRestrictionKey,
  deleteField,
  setPropertyName,
  addRestriction,
  deleteProperty,
  setRequired,
  addProperty,
  addEnum,
  deleteEnum,
} from '../features/editor/schemaEditorSlice';
import {
  splitParentPathAndName,
  getUiSchemaItem,
} from '../utils/schema';
import { getTranslation } from '../utils/language';
import { RestrictionField } from './RestrictionField';
import { EnumField } from './EnumField';
import { SchemaTab } from './SchemaTab';
import InlineObject from './InlineObject';
import { isFieldRequired, isNameInUse } from '../utils/checks';
import { AddPropertyButton } from './AddPropertyButton';
import { ItemDataComponent } from './ItemDataComponent';

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
    divider: {
      marginTop: 2,
      marginBottom: 2,
      padding: '8px 2px 8px 2px',
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

const SchemaInspector = (props: ISchemaInspectorProps) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [objectKind, setObjectKind] = React.useState<ObjectKind>(ObjectKind.Field);
  const [isRequired, setIsRequired] = React.useState<boolean>(false);
  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties'
      ? state.selectedPropertyNodeId
      : state.selectedDefinitionNodeId,
  );
  const [tabIndex, setTabIndex] = React.useState('0');

  const selectedItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      return getUiSchemaItem(state.uiSchema, selectedId);
    }
    return null;
  });

  // if item is a reference, we want to show the properties of the reference.
  const itemToDisplay = useSelector((state: ISchemaState) =>
    selectedItem?.$ref
      ? state.uiSchema.find((i: UiSchemaItem) => i.path === selectedItem.$ref)
      : selectedItem,
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

  const uiSchema = useSelector((state: ISchemaState) => {
    return state.uiSchema;
  });

  React.useEffect(() => {
    if (selectedItem) {
      if (tabIndex === '2' && itemToDisplay?.type !== 'object') {
        setTabIndex('0');
      }

      setIsRequired(isFieldRequired(parentItem, selectedItem));

      if (selectedItem.$ref !== undefined ||
        selectedItem.items?.$ref !== undefined) {
        setObjectKind(ObjectKind.Reference);
      } else if (selectedItem.combination) {
        setObjectKind(ObjectKind.Combination);
      } else {
        setObjectKind(ObjectKind.Field);
      }
    } else {
      setIsRequired(false);
      setObjectKind(ObjectKind.Field);
      setTabIndex('0');
    }
  }, [selectedItem, parentItem, tabIndex, itemToDisplay]);

  const readOnly = selectedItem?.$ref !== undefined;

  const onChangeValue = (path: string, value: any, key: string) => {
    const data = {
      path,
      value: isNaN(value) ? value : +value,
      key,
    };
    dispatch(setRestriction(data));
  };

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    if (oldKey === newKey) {
      return;
    }
    dispatch(
      setRestrictionKey({
        path,
        oldKey,
        newKey,
      }),
    );
  };

  const onChangePropertyName = (path: string, value: string) => {
    dispatch(
      setPropertyName({
        path,
        name: value,
      }),
    );
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

  const checkIsNameInUse = (name: string) => {
    return isNameInUse({
      uiSchemaItems: uiSchema,
      parentSchema: parentItem,
      path: selectedId,
      name,
    });
  }

  const onChangeEnumValue = (value: string, oldValue?: string) => {
    if (itemToDisplay) {
      dispatch(
        addEnum({
          path: itemToDisplay.path,
          value,
          oldValue,
        }),
      );
    }
  };

  const onAddPropertyClicked = (event: React.BaseSyntheticEvent) => {
    event.preventDefault();
    const path = itemToDisplay?.path;
    if (path) {
      dispatch(
        addProperty({
          path,
          keepSelection: true,
        }),
      );
    }
  };

  const onAddRestrictionClick = (event?: React.BaseSyntheticEvent) => {
    event?.preventDefault();
    if (itemToDisplay) {
      dispatch(
        addRestriction({
          path: itemToDisplay.path,
          key: '',
          value: '',
        }),
      );
    }
  };

  const onRestrictionReturn = (e: any) => {
    onAddRestrictionClick(e);
  };

  const onAddEnumButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (itemToDisplay) {
      dispatch(
        addEnum({
          path: itemToDisplay.path,
          value: 'value',
        }),
      );
    }
  };
  const handleRequiredChanged = (e: any, checked: boolean) => {
    if (selectedItem) {
      dispatch(
        setRequired({
          path: selectedId,
          key: selectedItem.displayName,
          required: checked,
        }),
      );
      setIsRequired(checked);
    }
  };

  const renderItemProperties = (item: UiSchemaItem) =>{
    if (!item.properties) return null;

    return item.properties.map((p: UiSchemaItem) => {
      return (
        <PropertyItem
          language={props.language}
          key={p.path}
          required={item.required?.includes(p.displayName)}
          readOnly={readOnly}
          value={p.displayName}
          fullPath={p.path}
          onChangeValue={onChangePropertyName}
          onDeleteField={onDeleteObjectClick}
        />
      );
    });
  }

  const renderItemRestrictions = (item: UiSchemaItem) =>
    item.restrictions?.map((field: Restriction) => {
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
      />
    ));
  };

  const handleTabChange = (event: any, newValue: string) => {
    setTabIndex(newValue);
  };

  if (!selectedId) {
    return (
      <div>
        <p className={classes.noItem} id='no-item-paragraph'>
          {getTranslation('no_item_selected', props.language)}
        </p>
        <hr className={classes.divider} />
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <TabContext value={tabIndex}>
        <AppBar position='static' color='default' className={classes.appBar}>
          <TabList onChange={handleTabChange} aria-label='inspector tabs'>
            <SchemaTab label='properties' language={props.language} value='0' />
            <SchemaTab
              label='restrictions'
              language={props.language}
              value='1'
              hide={
                objectKind === ObjectKind.Combination || selectedItem?.combinationItem
              }
            />
            <SchemaTab
              label='fields'
              language={props.language}
              value='2'
              hide={
                selectedItem?.type !== 'object' || selectedItem.combinationItem
              }
            />
          </TabList>
        </AppBar>
        <TabPanel value='0'>
          {selectedItem?.combinationItem && selectedItem.$ref === undefined ? (
            <InlineObject item={selectedItem} language={props.language} />
          ) : (
            <ItemDataComponent
              selectedId={selectedId}
              selectedItem={selectedItem}
              parentItem={parentItem}
              objectKind={objectKind}
              language={props.language}
              checkIsNameInUse={checkIsNameInUse}
            />
          )}
        </TabPanel>
        <TabPanel value='1'>
          <Grid container spacing={1} className={classes.gridContainer}>
            <Grid item xs={12}>
              <FormControlLabel
                className={classes.header}
                control={
                  <Checkbox
                    checked={isRequired}
                    onChange={handleRequiredChanged}
                    name='checkedRequired'
                  />
                }
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
            {itemToDisplay && renderItemRestrictions(itemToDisplay)}
            <IconButton
              id='add-restriction-button'
              aria-label={getTranslation('add_restriction', props.language)}
              onClick={onAddRestrictionClick}
            >
              <i className='fa fa-plus' />
              {getTranslation('add_restriction', props.language)}
            </IconButton>
            {selectedItem && selectedItem.type !== 'object' && (
              <>
                <Grid item xs={12}>
                  <hr className={classes.divider} />
                  <p className={classes.header}>
                    {getTranslation('enum', props.language)}
                  </p>
                </Grid>
                {itemToDisplay && renderEnums(itemToDisplay)}
                <IconButton
                  id='add-enum-button'
                  aria-label={getTranslation('add_enum', props.language)}
                  onClick={onAddEnumButtonClick}
                >
                  <i className='fa fa-plus' />
                  {getTranslation('add_enum', props.language)}
                </IconButton>
              </>
            )}
          </Grid>
        </TabPanel>
        <TabPanel value='2'>
          <Grid container spacing={3} className={classes.gridContainer}>
            {itemToDisplay && renderItemProperties(itemToDisplay)}
          </Grid>
          {!readOnly &&
            <AddPropertyButton
              onAddPropertyClick={onAddPropertyClicked}
              language={props.language}
            />
          }
        </TabPanel>
      </TabContext>
    </div>
  );
};

export default SchemaInspector;
