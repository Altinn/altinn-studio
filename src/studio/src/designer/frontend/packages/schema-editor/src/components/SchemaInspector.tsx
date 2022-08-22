import { AppBar, Divider } from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import type { ILanguage, UiSchemaItem } from '../types';
import { ObjectKind } from '../types/enums';
import { getTranslation } from '../utils/language';
import { SchemaTab } from './SchemaTab';
import { isFieldRequired } from '../utils/checks';
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
  selectedId?: string;
  selectedItem?: UiSchemaItem;
  itemToDisplay?: UiSchemaItem;
  parentItem?: UiSchemaItem;
  checkIsNameInUse: (name: string) => boolean;
}

export const SchemaInspector = ({
  language,
  selectedItem,
  selectedId,
  itemToDisplay,
  parentItem,
  checkIsNameInUse,
}: ISchemaInspectorProps) => {
  const classes = useStyles();
  const [objectKind, setObjectKind] = useState<ObjectKind>(ObjectKind.Field);

  const [tabIndex, setTabIndex] = useState('0');

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

  const __ = (key: string) => getTranslation(key, language);

  return selectedId ? (
    <div className={classes.root} data-testid='schema-inspector'>
      <TabContext value={tabIndex}>
        <AppBar position='static' color='default' className={classes.appBar}>
          <TabList
            onChange={(e: any, v: string) => setTabIndex(v)}
            aria-label='inspector tabs'
          >
            <SchemaTab label={__('properties')} value='0' />
            <SchemaTab
              label={__('restrictions')}
              value='1'
              hide={
                objectKind === ObjectKind.Combination ||
                selectedItem?.combinationItem
              }
            />
            <SchemaTab
              label={__('fields')}
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
            language={language}
            parentItem={parentItem ?? undefined}
          />
        </TabPanel>
        <TabPanel value='1'>
          <ItemRestrictionsTab
            classes={classes}
            isRequired={isRequired}
            itemToDisplay={itemToDisplay ?? undefined}
            language={language}
            readonly={readOnly}
          />
        </TabPanel>
        <TabPanel value='2'>
          <ItemFieldsTab
            classes={classes}
            itemToDisplay={itemToDisplay ?? undefined}
            language={language}
            readonly={readOnly}
          />
        </TabPanel>
      </TabContext>
    </div>
  ) : (
    <div>
      <p className={classes.noItem} id='no-item-paragraph'>
        {__('no_item_selected')}
      </p>
      <Divider />
    </div>
  );
};
