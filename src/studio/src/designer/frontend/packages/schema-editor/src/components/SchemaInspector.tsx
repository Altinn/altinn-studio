import React, { useEffect, useState } from 'react';
import { AppBar, Divider } from '@material-ui/core';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { ILanguage, UiSchemaItem } from '../types';
import { ObjectKind } from '../types/enums';
import { getTranslation } from '../utils/language';
import { SchemaTab } from './SchemaTab';
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
  selectedItem?: UiSchemaItem;
  referredItem?: UiSchemaItem;
  checkIsNameInUse: (name: string) => boolean;
}

export const SchemaInspector = ({
  language,
  selectedItem,
  checkIsNameInUse,
}: ISchemaInspectorProps) => {
  const classes = useStyles();
  const [tabIndex, setTabIndex] = useState('0');
  const __ = (key: string) => getTranslation(key, language);

  useEffect(() => {
    if (selectedItem) {
      if (tabIndex === '2' && selectedItem?.type !== 'object') {
        setTabIndex('0');
      }
    } else {
      setTabIndex('0');
    }
  }, [tabIndex, selectedItem]);

  return selectedItem ? (
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
                getObjectKind(selectedItem) === ObjectKind.Combination ||
                selectedItem.combinationItem
              }
            />
            <SchemaTab
              label={__('fields')}
              value='2'
              hide={
                selectedItem.type !== 'object' || selectedItem.combinationItem
              }
            />
          </TabList>
        </AppBar>
        <div style={{ color: 'lightgray' }}>{selectedItem.path}</div>
        <TabPanel value='0'>
          <ItemPropertiesTab
            checkIsNameInUse={checkIsNameInUse}
            selectedItem={selectedItem}
            language={language}
          />
        </TabPanel>
        <TabPanel value='1'>
          <ItemRestrictionsTab
            classes={classes}
            selectedItem={selectedItem}
            language={language}
          />
        </TabPanel>
        <TabPanel value='2'>
          <ItemFieldsTab
            classes={classes}
            selectedItem={selectedItem}
            language={language}
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
