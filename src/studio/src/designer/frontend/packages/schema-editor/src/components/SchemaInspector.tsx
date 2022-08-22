import { AppBar } from '@material-ui/core';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import type { ILanguage, ISchemaState, UiSchemaItem } from '../types';
import { ObjectKind } from '../types/enums';
import { getUiSchemaItem, splitParentPathAndName } from '../utils/schema';
import { getTranslation } from '../utils/language';
import { SchemaTab } from './SchemaTab';
import { isFieldRequired, isNameInUse } from '../utils/checks';
import { ItemRestrictionsTab } from './SchemaInspector/ItemRestrictionsTab';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { getObjectKind } from '../utils/ui-schema-utils';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';

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

export const SchemaInspector = (props: ISchemaInspectorProps) => {
  const classes = useStyles();
  const [objectKind, setObjectKind] = React.useState<ObjectKind>(
    ObjectKind.Field,
  );

  const [tabIndex, setTabIndex] = React.useState('0');

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties'
      ? state.selectedPropertyNodeId
      : state.selectedDefinitionNodeId,
  );

  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getUiSchemaItem(state.uiSchema, selectedId) : null,
  );

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

  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);

  const isRequired = selectedItem
    ? isFieldRequired(parentItem, selectedItem)
    : false;
  const readOnly = selectedItem?.$ref !== undefined;

  useEffect(() => {
    if (itemToDisplay) {
      if (tabIndex === '2' && itemToDisplay?.type !== 'object') {
        setTabIndex('0');
      }
      setObjectKind(getObjectKind(itemToDisplay));
    } else {
      setObjectKind(ObjectKind.Field);
      setTabIndex('0');
    }
  }, [tabIndex, itemToDisplay]);

  const checkIsNameInUse = (name: string) =>
    isNameInUse({
      uiSchemaItems: uiSchema,
      parentSchema: parentItem,
      path: selectedId,
      name,
    });

  const handleTabChange = (event: any, newValue: string) =>
    setTabIndex(newValue);

  return selectedId ? (
    <div className={classes.root} data-testid='schema-inspector'>
      <TabContext value={tabIndex}>
        <AppBar position='static' color='default' className={classes.appBar}>
          <TabList onChange={handleTabChange} aria-label='inspector tabs'>
            <SchemaTab label='properties' language={props.language} value='0' />
            <SchemaTab
              label='restrictions'
              language={props.language}
              value='1'
              hide={
                objectKind === ObjectKind.Combination ||
                selectedItem?.combinationItem
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
          <ItemPropertiesTab
            checkIsNameInUse={checkIsNameInUse}
            itemToDisplay={itemToDisplay ?? undefined}
            language={props.language}
            parentItem={parentItem ?? undefined}
          />
        </TabPanel>
        <TabPanel value='1'>
          <ItemRestrictionsTab
            classes={classes}
            isRequired={isRequired}
            itemToDisplay={itemToDisplay ?? undefined}
            language={props.language}
            readonly={readOnly}
          />
        </TabPanel>
        <TabPanel value='2'>
          <ItemFieldsTab
            classes={classes}
            itemToDisplay={itemToDisplay ?? undefined}
            language={props.language}
            readonly={readOnly}
          />
        </TabPanel>
      </TabContext>
    </div>
  ) : (
    <div>
      <p className={classes.noItem} id='no-item-paragraph'>
        {getTranslation('no_item_selected', props.language)}
      </p>
      <hr className={classes.divider} />
    </div>
  );
};
