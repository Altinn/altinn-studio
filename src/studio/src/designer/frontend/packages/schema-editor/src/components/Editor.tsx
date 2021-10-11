import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { TabContext, TabList, TabPanel, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Button, Typography } from '@material-ui/core';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { ILanguage, ISchema, ISchemaState, PropertyType, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRootItem, setSchemaName, setSelectedTab } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import { getDomFriendlyID, getTranslation } from '../utils';
import SchemaInspector from './SchemaInspector';
import { SchemaTab } from './SchemaTab';
import TopToolbar from './TopToolbar';

const useStyles = makeStyles({
  root: {
    height: '100%',
    width: '100%',
    display: 'inline-flex',
    flexWrap: 'wrap',
    '& > main': {
      flex: 1,
      maxWidth: 'calc(100% - 501px)',
    },
  },
  editor: {
    backgroundColor: 'white',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    minHeight: 200,
    margin: 18,
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
  tab: {
    minWidth: 70,
  },
  treeItem: {
    marginLeft: 8,
    '&.Mui-selected': {
      background: '#E3F7FF',
      border: '1px solid #006BD8',
      boxSizing: 'border-box',
      borderRadius: '5px',
    },
    '&.Mui-selected > .MuiTreeItem-content .MuiTreeItem-label, .MuiTreeItem-root.Mui-selected:focus > .MuiTreeItem-content .MuiTreeItem-label': {
      backgroundColor: 'transparent',
    },
  },
  treeView: {
    height: 600,
    flexGrow: 1,
    overflow: 'auto',
  },
  inspector: {
    background: 'white',
    borderLeft: '1px solid #C9C9C9',
    position: 'sticky',
    top: 110,
    width: 500,
    height: 'calc(100vh - 110px)',
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
  schema: ISchema;
  onSaveSchema: (payload: any) => void;
  Toolbar: JSX.Element;
  LoadingIndicator: JSX.Element;
  name?: string;
  language: ILanguage;
}

export const Editor = (props: IEditorProps) => {
  const {
    Toolbar, LoadingIndicator, schema, onSaveSchema, name, language,
  } = props;

  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedPropertyNode = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const selectedDefinitionNode = useSelector((state: ISchemaState) => state.selectedDefinitionNodeId);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/definitions')));
  const properties = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/properties/')));
  const selectedTab: string = useSelector((state: ISchemaState) => state.selectedEditorTab);
  const [expandedPropertiesNodes, setExpandedPropertiesNodes] = React.useState<string[]>([]);
  const [expandedDefinitionsNodes, setExpandedDefinitionsNodes] = React.useState<string[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | Element>(null);

  const saveSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

  React.useEffect(() => {
    dispatch(setSchemaName({ name }));
  }, [dispatch, name]);

  React.useEffect(() => {
    if (jsonSchema) {
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

  const handleAddProperty = (type: PropertyType) => {
    dispatch(addRootItem({
      name: 'name',
      location: 'properties',
      type: (type === 'field' ? '' : undefined),
      $ref: (type === 'reference' ? '' : undefined),
    }));
    setMenuAnchorEl(null);
  };

  const handleAddDefinition = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(addRootItem({
      name: 'name',
      location: 'definitions',
      type: '',
    }));
  };

  const handlePropertiesNodeExpanded = (_x: React.ChangeEvent<{}>, nodeIds: string[]) => {
    setExpandedPropertiesNodes(nodeIds);
  };

  const handleDefinitionsNodeExpanded = (_x: React.ChangeEvent<{}>, nodeIds: string[]) => {
    setExpandedDefinitionsNodes(nodeIds);
  };

  const handleTabChanged = (_x: React.ChangeEvent<{}>, value: string) => {
    dispatch(setSelectedTab({ selectedTab: value }));
  };

  return (
    <div className={classes.root}>
      <main>
        <TopToolbar
          Toolbar={Toolbar}
          language={language}
          saveAction={name ? saveSchema : undefined}
        />
        {name && schema ? (
          <div id='schema-editor' className={classes.editor}>
            <TabContext value={selectedTab}>
              <AppBar
                position='static' color='default'
                className={classes.appBar}
              >
                <TabList
                  onChange={handleTabChanged}
                  aria-label='model-tabs'
                >
                  <SchemaTab
                    label='models'
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
              <TabPanel value='properties'>
                <Button
                  endIcon={<i className='fa fa-drop-down'/>}
                  onClick={openMenu}
                  className={classes.addButton}
                  id='add-button'
                >
                  <Typography variant='body1'>{getTranslation('add', language)}</Typography>
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
                  {properties?.map((item: UiSchemaItem) => <SchemaItem
                    keyPrefix='properties'
                    key={item.path}
                    item={item}
                    nodeId={getDomFriendlyID(item.path)}
                    id={getDomFriendlyID(item.path)}
                    language={language}
                    isPropertiesView={true}
                  />)}
                </TreeView>
              </TabPanel>
              <TabPanel value='definitions'>
                <Button
                  startIcon={<i className='fa fa-plus'/>}
                  onClick={handleAddDefinition}
                  className={classes.addButton}
                  classes={{
                    startIcon: classes.startIcon,
                  }}
                >
                  <Typography variant='body1'>{getTranslation('add_element', language)}</Typography>
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
                  {definitions.map((def) => <SchemaItem
                    keyPrefix='definitions'
                    item={def}
                    key={def.path}
                    nodeId={getDomFriendlyID(def.path)}
                    id={getDomFriendlyID(def.path)}
                    language={language}
                  />)}
                </TreeView>
              </TabPanel>
            </TabContext>
          </div>) : LoadingIndicator}
      </main>
      {schema &&
        <aside className={classes.inspector}>
          <SchemaInspector language={language} />
        </aside>
      }
      <AltinnMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={closeMenu}
      >
        <AltinnMenuItem
          onClick={() => handleAddProperty('field')}
          text={getTranslation('field', language)}
          iconClass='fa fa-datamodel-properties'
          id='add-field-button'
        />
        <AltinnMenuItem
          onClick={() => handleAddProperty('reference')}
          text={getTranslation('reference', language)}
          iconClass='fa fa-datamodel-ref'
          id='add-reference-button'
        />
      </AltinnMenu>
    </div>
  );
};
export default Editor;
