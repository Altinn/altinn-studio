import React, { ChangeEvent, MouseEvent, SyntheticEvent, useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { TabContext, TabList, TabPanel } from '@material-ui/lab';
import { useDispatch, useSelector } from 'react-redux';
import { AppBar, Button, Typography } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem, AltinnSpinner } from 'app-shared/components';
import type { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { CombinationKind, FieldType } from '../types';
import { ObjectKind } from '../types/enums';
import {
  addRootItem,
  setJsonSchema,
  setSchemaName,
  setSelectedTab,
  setUiSchema,
  updateJsonSchema,
} from '../features/editor/schemaEditorSlice';
import { getTranslation } from '../utils/language';
import { getSchemaFromPath, getUiSchemaItem, splitParentPathAndName } from '../utils/schema';
import { SchemaInspector } from './SchemaInspector';
import { SchemaTab } from './common/SchemaTab';
import { TopToolbar } from './TopToolbar';
import { getSchemaSettings } from '../settings';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { isNameInUse } from '../utils/checks';
import { SchemaTreeView } from './TreeView/SchemaTreeView';
import { createRefSelector } from './TreeView/tree-view-helpers';

const useStyles = makeStyles({
  root: {
    height: 'calc(100vh - 111px)',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    '& > main': {
      display: 'flex',
      flexDirection: 'row',
      flexGrow: 1,
      alignItems: 'stretch',
      minHeight: 0,
    },
  },
  editor: {
    backgroundColor: 'white',
    minHeight: 200,
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  appBar: {
    borderBottom: '1px solid #C9C9C9',
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
  tabPanel: {
    overflowY: 'scroll',
    flexGrow: 1,
  },
  inspector: {
    background: 'white',
    borderLeft: '1px solid #C9C9C9',
    overflowX: 'clip',
    overflowY: 'auto',
  },
  addButton: {
    border: '1px dashed rgba(0, 0, 0, 1)',
    borderRadius: '0px',
    '&:hover': {
      border: '1px solid rgba(0, 0, 0, 1)',
    },
    textTransform: 'none',
    color: 'black',
    '& > i': {
      fontSize: '24px',
    },
    marginBottom: '12px',
    marginLeft: '8px',
  },
  startIcon: {
    marginRight: '0px',
  },
});

export interface IEditorProps {
  Toolbar: JSX.Element;
  LandingPagePanel: JSX.Element;
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: ISchema;
}

export const SchemaEditor = (props: IEditorProps) => {
  const { Toolbar, LandingPagePanel, loading, schema, onSaveSchema, name, language } = props;

  const classes = useStyles();
  const dispatch = useDispatch();

  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedPropertyNode = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const selectedDefinitionNode = useSelector((state: ISchemaState) => state.selectedDefinitionNodeId);

  const schemaSettings = getSchemaSettings({ schemaUrl: jsonSchema?.$schema });
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const definitions = uiSchema.filter((d: UiSchemaItem) => d.path.startsWith(`${schemaSettings.definitionsPath}/`));
  const modelView = uiSchema.filter((d: UiSchemaItem) => {
    if (d.path.startsWith(schemaSettings.propertiesPath)) {
      return true;
    }

    if (schemaSettings.rootNodePath !== '#/oneOf') {
      return d.path.startsWith(schemaSettings.rootNodePath);
    }
    const modelsArray = getSchemaFromPath(schemaSettings.rootNodePath.slice(1), jsonSchema);
    if (modelsArray && Array.isArray(modelsArray)) {
      return modelsArray.find((m) => m.$ref === d.path);
    }
    return false;
  });

  const selectedTab: string = useSelector((state: ISchemaState) => state.selectedEditorTab);
  const [expandedPropertiesNodes, setExpandedPropertiesNodes] = useState<string[]>([]);
  const [expandedDefinitionsNodes, setExpandedDefinitionsNodes] = useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | Element>(null);
  const [editMode, setEditMode] = useState(false);

  const saveSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

  useEffect(() => {
    if (name) {
      dispatch(setSchemaName({ name }));
    }
  }, [dispatch, name]);

  useEffect(() => {
    if (jsonSchema && name) {
      dispatch(setUiSchema({ name }));
    }
  }, [dispatch, jsonSchema, name]);

  useEffect(() => {
    dispatch(setJsonSchema({ schema }));
  }, [dispatch, schema]);

  const openMenu = (e: MouseEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  };

  const closeMenu = (e: SyntheticEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleAddProperty = (type: ObjectKind) => {
    dispatch(
      addRootItem({
        name: 'name',
        location: schemaSettings.propertiesPath,
        props: {
          type: type === ObjectKind.Field ? FieldType.Object : undefined,
          $ref: type === ObjectKind.Reference ? '' : undefined,
          combination: type === ObjectKind.Combination ? [] : undefined,
          combinationKind: type === ObjectKind.Combination ? CombinationKind.AllOf : undefined,
        },
      }),
    );
    setMenuAnchorEl(null);
  };

  const toggleEditMode = () => setEditMode((prevState) => !prevState);

  const handleAddDefinition = (e: MouseEvent) => {
    e.stopPropagation();
    dispatch(
      addRootItem({
        name: 'name',
        location: schemaSettings.definitionsPath,
        props: {
          type: FieldType.Object,
        },
      }),
    );
  };

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => {
    setExpandedPropertiesNodes(nodeIds);
  };

  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) => {
    setExpandedDefinitionsNodes(nodeIds);
  };

  const handleTabChanged = (_x: ChangeEvent<unknown>, value: 'definitions' | 'properties') => {
    dispatch(setSelectedTab({ selectedTab: value }));
  };
  const loadingIndicator = loading ? (
    <AltinnSpinner spinnerText={getLanguageFromKey('general.loading', language)} />
  ) : null;

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties' ? state.selectedPropertyNodeId : state.selectedDefinitionNodeId,
  );

  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getUiSchemaItem(state.uiSchema, selectedId) : null,
  );

  // if item is a reference, we want to show the properties of the reference.
  const referredItem = useSelector(createRefSelector(selectedItem?.$ref));

  const parentItem = useSelector((state: ISchemaState) => {
    if (selectedId) {
      const [parentPath] = splitParentPathAndName(selectedId);
      if (parentPath) {
        return getUiSchemaItem(state.uiSchema, parentPath);
      }
    }
    return null;
  });

  const checkIsNameInUse = (name: string) =>
    isNameInUse({
      uiSchemaItems: uiSchema,
      parentSchema: parentItem,
      path: selectedId,
      name,
    });
  const t = (key: string) => getTranslation(key, language);
  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={Toolbar}
        language={language}
        saveAction={name ? saveSchema : undefined}
        toggleEditMode={name ? toggleEditMode : undefined}
        editMode={editMode}
      />
      <main>
        {LandingPagePanel}
        {name && schema ? (
          <div data-testid='schema-editor' id='schema-editor' className={classes.editor}>
            <TabContext value={selectedTab}>
              <AppBar position='static' color='default' className={classes.appBar}>
                <TabList onChange={handleTabChanged} aria-label='model-tabs'>
                  <SchemaTab label={t('model')} value='properties' />
                  <SchemaTab label={t('types')} value='definitions' />
                </TabList>
              </AppBar>
              <TabPanel className={classes.tabPanel} value='properties'>
                {editMode && (
                  <Button
                    endIcon={<i className='fa fa-drop-down' />}
                    onClick={openMenu}
                    className={classes.addButton}
                    id='add-button'
                  >
                    <Typography variant='body1'>{t('add')}</Typography>
                  </Button>
                )}
                <SchemaTreeView
                  editMode={editMode}
                  expanded={expandedPropertiesNodes}
                  items={modelView}
                  translate={t}
                  onNodeToggle={handlePropertiesNodeExpanded}
                  selectedNode={selectedPropertyNode}
                />
              </TabPanel>
              <TabPanel className={classes.tabPanel} value='definitions'>
                {editMode && (
                  <Button
                    startIcon={<i className='fa fa-plus' />}
                    onClick={handleAddDefinition}
                    className={classes.addButton}
                    classes={{ startIcon: classes.startIcon }}
                  >
                    <Typography variant='body1'>{t('add_element')}</Typography>
                  </Button>
                )}
                <SchemaTreeView
                  editMode={editMode}
                  expanded={expandedDefinitionsNodes}
                  items={definitions}
                  translate={t}
                  onNodeToggle={handleDefinitionsNodeExpanded}
                  selectedNode={selectedDefinitionNode}
                />
              </TabPanel>
            </TabContext>
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && editMode && (
          <aside className={classes.inspector}>
            <SchemaInspector
              language={language}
              referredItem={referredItem ?? undefined}
              selectedItem={selectedItem ?? undefined}
              checkIsNameInUse={checkIsNameInUse}
            />
          </aside>
        )}
      </main>
      <AltinnMenu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={closeMenu}>
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Field)}
          text={t('field')}
          iconClass='fa fa-datamodel-properties'
          id='add-field-button'
        />
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Reference)}
          text={t('reference')}
          iconClass='fa fa-datamodel-ref'
          id='add-reference-button'
        />
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Combination)}
          text={t('combination')}
          iconClass='fa fa-group'
          id='add-combination-button'
        />
      </AltinnMenu>
    </div>
  );
};
