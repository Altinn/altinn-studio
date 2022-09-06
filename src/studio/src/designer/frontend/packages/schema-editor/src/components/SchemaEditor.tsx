import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { TabContext, TabList, TabPanel, TreeView } from '@material-ui/lab';
import { useDispatch, useSelector } from 'react-redux';
import { AppBar, Button, Typography } from '@material-ui/core';
import {
  AltinnMenu,
  AltinnMenuItem,
  AltinnSpinner,
} from 'app-shared/components';
import type { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { ObjectKind } from '../types/enums';
import {
  addRootItem,
  setJsonSchema,
  setSchemaName,
  setSelectedTab,
  setUiSchema,
  updateJsonSchema,
} from '../features/editor/schemaEditorSlice';
import { SchemaItem } from './SchemaItem';
import { getTranslation } from '../utils/language';
import {
  getDomFriendlyID,
  getSchemaFromPath,
  getUiSchemaItem,
  splitParentPathAndName,
} from '../utils/schema';
import { SchemaInspector } from './SchemaInspector';
import { SchemaTab } from './SchemaTab';
import { TopToolbar } from './TopToolbar';
import { getSchemaSettings } from '../settings';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { isNameInUse } from '../utils/checks';

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
      minHeight: 0
    },
  },
  editor: {
    backgroundColor: 'white',
    minHeight: 200,
    flexGrow: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
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
  tab: {
    minWidth: 70,
  },
  tabPanel: {
    overflowY: 'scroll',
    flexGrow: 1
  },
  treeItem: {
    marginLeft: 8,
    '&.Mui-selected': {
      background: '#E3F7FF',
      border: '1px solid #006BD8',
      boxSizing: 'border-box',
      borderRadius: '5px',
    },
    '&.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label, .MuiTreeItem-root.Mui-selected:focus > .MuiTreeItem-content .MuiTreeItem-label':
      {
        backgroundColor: 'transparent',
      },
  },
  treeView: {
    flexGrow: 1,
    overflow: 'auto',
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
  language: ILanguage;
  loading?: boolean;
  name?: string;
  onSaveSchema: (payload: any) => void;
  schema: ISchema;
}

export const SchemaEditor = (props: IEditorProps) => {
  const { Toolbar, loading, schema, onSaveSchema, name, language } = props;

  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedPropertyNode = useSelector(
    (state: ISchemaState) => state.selectedPropertyNodeId,
  );
  const selectedDefinitionNode = useSelector(
    (state: ISchemaState) => state.selectedDefinitionNodeId,
  );

  const schemaSettings = getSchemaSettings({schemaUrl: jsonSchema?.$schema});
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const definitions = uiSchema.filter((d: UiSchemaItem) => d.path.startsWith(`${schemaSettings.definitionsPath}/`));
  const modelView = uiSchema.filter((d: UiSchemaItem) => {
      if (schemaSettings.rootNodePath !== '#/oneOf') {
        return d.path.startsWith(schemaSettings.rootNodePath);
      }
      const modelsArray = getSchemaFromPath(schemaSettings.rootNodePath.slice(1), jsonSchema);
      if (modelsArray && Array.isArray(modelsArray)) {
        return modelsArray.find(m => m.$ref === d.path);
      }
      return false;
    }
  );

  const selectedTab: string = useSelector(
    (state: ISchemaState) => state.selectedEditorTab,
  );
  const [expandedPropertiesNodes, setExpandedPropertiesNodes] = React.useState<
    string[]
  >([]);
  const [expandedDefinitionsNodes, setExpandedDefinitionsNodes] =
    React.useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | Element>(null);

  const saveSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

  React.useEffect(() => {
    if (name) {
      dispatch(setSchemaName({ name }));
    }
  }, [dispatch, name]);

  React.useEffect(() => {
    if (jsonSchema && name) {
      dispatch(setUiSchema({ name }));
    }
  }, [dispatch, jsonSchema, name]);

  React.useEffect(() => {
    dispatch(setJsonSchema({ schema }));
  }, [dispatch, schema]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  };

  const closeMenu = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    setMenuAnchorEl(null);
  };

  const handleAddProperty = (type: ObjectKind) => {
    dispatch(
      addRootItem({
        name: 'name',
        location: 'properties',
        props: {
          type: type === ObjectKind.Field ? 'object' : undefined,
          $ref: type === ObjectKind.Reference ? '' : undefined,
          combination: type === ObjectKind.Combination ? [] : undefined,
          combinationKind:
            type === ObjectKind.Combination ? 'allOf' : undefined,
        },
      }),
    );
    setMenuAnchorEl(null);
  };

  const handleAddDefinition = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(
      addRootItem({
        name: 'name',
        location: 'definitions',
        props: {
          type: 'object',
        },
      }),
    );
  };

  const handlePropertiesNodeExpanded = (
    _x: React.ChangeEvent<unknown>,
    nodeIds: string[],
  ) => {
    setExpandedPropertiesNodes(nodeIds);
  };

  const handleDefinitionsNodeExpanded = (
    _x: React.ChangeEvent<unknown>,
    nodeIds: string[],
  ) => {
    setExpandedDefinitionsNodes(nodeIds);
  };

  const handleTabChanged = (
    _x: React.ChangeEvent<unknown>,
    value: 'definitions' | 'properties',
  ) => {
    dispatch(setSelectedTab({ selectedTab: value }));
  };
  const loadingIndicator = loading ? (
    <AltinnSpinner
      spinnerText={getLanguageFromKey('general.loading', language)}
    />
  ) : null;

  const selectedId = useSelector((state: ISchemaState) =>
    state.selectedEditorTab === 'properties'
      ? state.selectedPropertyNodeId
      : state.selectedDefinitionNodeId,
  );

  const selectedItem = useSelector((state: ISchemaState) =>
    selectedId ? getUiSchemaItem(state.uiSchema, selectedId) : null,
  );

  // if item is a reference, we want to show the properties of the reference.
  const referredItem = useSelector((state: ISchemaState) =>
    selectedItem?.$ref
      ? state.uiSchema.find((i: UiSchemaItem) => i.path === selectedItem.$ref)
      : null,
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

  const checkIsNameInUse = (name: string) =>
    isNameInUse({
      uiSchemaItems: uiSchema,
      parentSchema: parentItem,
      path: selectedId,
      name,
    });
  return (
    <div className={classes.root}>
      <TopToolbar
        Toolbar={Toolbar}
        language={language}
        saveAction={name ? saveSchema : undefined}
      />
      <main>
        {name && schema ? (
          <div
            data-testid='schema-editor'
            id='schema-editor'
            className={classes.editor}
          >
            <TabContext value={selectedTab}>
              <AppBar
                position='static'
                color='default'
                className={classes.appBar}
              >
                <TabList onChange={handleTabChanged} aria-label='model-tabs'>
                  <SchemaTab
                    label='model'
                    language={language}
                    value='properties'
                  />
                  <SchemaTab
                    label='types'
                    language={language}
                    value='definitions'
                  />
                </TabList>
              </AppBar>
              <TabPanel className={classes.tabPanel} value='properties'>
                <Button
                  endIcon={<i className='fa fa-drop-down' />}
                  onClick={openMenu}
                  className={classes.addButton}
                  id='add-button'
                >
                  <Typography variant='body1'>
                    {getTranslation('add', language)}
                  </Typography>
                </Button>
                <TreeView
                  className={classes.treeView}
                  multiSelect={false}
                  selected={getDomFriendlyID(selectedPropertyNode)}
                  defaultCollapseIcon={<ArrowDropDown />}
                  defaultExpandIcon={<ArrowRight />}
                  expanded={expandedPropertiesNodes}
                  onNodeToggle={handlePropertiesNodeExpanded}
                >
                  {modelView?.map((item: UiSchemaItem) => (
                    <SchemaItem
                      keyPrefix='properties'
                      key={item.path}
                      item={item}
                      nodeId={getDomFriendlyID(item.path)}
                      id={getDomFriendlyID(item.path)}
                      language={language}
                      isPropertiesView={true}
                    />
                  ))}
                </TreeView>
              </TabPanel>
              <TabPanel className={classes.tabPanel} value='definitions'>
                <Button
                  startIcon={<i className='fa fa-plus' />}
                  onClick={handleAddDefinition}
                  className={classes.addButton}
                  classes={{
                    startIcon: classes.startIcon,
                  }}
                >
                  <Typography variant='body1'>
                    {getTranslation('add_element', language)}
                  </Typography>
                </Button>
                <TreeView
                  className={classes.treeView}
                  multiSelect={false}
                  selected={getDomFriendlyID(selectedDefinitionNode)}
                  defaultCollapseIcon={<ArrowDropDown />}
                  defaultExpandIcon={<ArrowRight />}
                  expanded={expandedDefinitionsNodes}
                  onNodeToggle={handleDefinitionsNodeExpanded}
                >
                  {definitions.map((def) => (
                    <SchemaItem
                      keyPrefix='definitions'
                      item={def}
                      key={def.path}
                      nodeId={getDomFriendlyID(def.path)}
                      id={getDomFriendlyID(def.path)}
                      language={language}
                    />
                  ))}
                </TreeView>
              </TabPanel>
            </TabContext>
          </div>
        ) : (
          loadingIndicator
        )}
        {schema && (
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
      <AltinnMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
      >
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Field)}
          text={getTranslation('field', language)}
          iconClass='fa fa-datamodel-properties'
          id='add-field-button'
        />
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Reference)}
          text={getTranslation('reference', language)}
          iconClass='fa fa-datamodel-ref'
          id='add-reference-button'
        />
        <AltinnMenuItem
          onClick={() => handleAddProperty(ObjectKind.Combination)}
          text={getTranslation('combination', language)}
          iconClass='fa fa-group'
          id='add-combination-button'
        />
      </AltinnMenu>
    </div>
  );
};
