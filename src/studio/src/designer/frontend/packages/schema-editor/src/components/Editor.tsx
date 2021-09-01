import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { ArrowDropDown, ArrowRight, ArchiveOutlined } from '@material-ui/icons';
import { TabContext, TabList, TabPanel, TreeItem, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Button } from '@material-ui/core';
import { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRootItem, setSchemaName, setSelectedTab } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import { getDomFriendlyID, getTranslation } from '../utils';
import SchemaInspector from './SchemaInspector';
import { SchemaTab } from './SchemaTab';

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
    '& > aside': {
      position: 'sticky',
      top: 110,
      width: 500,
      height: 'calc(100vh - 110px)',
      overflowX: 'clip',
      overflowY: 'auto',
    },
  },
  editor: {
    backgroundColor: 'white',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    minHeight: 200,
    margin: 18,
  },
  toolbar: {
    display: 'flex',
    background: '#fff',
    padding: 8,
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    '& > button': {
      margin: 4,
      background: '#fff',
      '&:last-child': {
        marginLeft: 'auto',
      },
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
    overflow: 'auto',
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

  function saveSchema() {
    dispatch(updateJsonSchema({ onSaveSchema }));
  }

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

  const handleAddProperty = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(addRootItem({
      name: 'name',
      location: 'properties',
    }));
  };
  const handleAddDefinition = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(addRootItem({
      name: 'name',
      location: 'definitions',
    }));
  };

  const handlePropertiesNodeExpanded = (_x: React.ChangeEvent<{}>, nodeIds: string[]) => {
    setExpandedPropertiesNodes(nodeIds);
  };

  const handleDefinitionsNodeExpanded = (_x: React.ChangeEvent<{}>, nodeIds: string[]) => {
    setExpandedDefinitionsNodes(nodeIds);
  };

  const handleTabChanged= (_x: React.ChangeEvent<{}>, value: string) => {
    dispatch(setSelectedTab({ selectedTab: value }));
  };

  if (!name) {
    return (
      <div className={classes.root}>
        <div className={classes.toolbar}>
          {Toolbar}
        </div>
      </div>
    );
  }
  return (
    <div className={classes.root}>
      <main>
        <section className={classes.toolbar}>
          {Toolbar}
          <Button
            onClick={saveSchema}
            type='button'
            variant='contained'
            disabled={!name}
            startIcon={<ArchiveOutlined />}
          >{getTranslation('save_data_model', language)}
          </Button>
        </section>
        {schema ? (
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
                    value='0'
                  />
                  <SchemaTab
                    label='types'
                    language={language}
                    value='1'
                  />
                </TabList>
              </AppBar>
              <TabPanel value='0'>
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
                  <TreeItem
                    nodeId='add_property'
                    icon={<i className='fa fa-plus' />}
                    label={getTranslation('add_property', language)}
                    onClick={handleAddProperty}
                  />
                </TreeView>
              </TabPanel>
              <TabPanel value='1'>
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
                  <TreeItem
                    nodeId='add_def'
                    icon={<i className='fa fa-plus' />}
                    label={getTranslation('add_property', language)}
                    onClick={handleAddDefinition}
                  />
                </TreeView>
              </TabPanel>
            </TabContext>
          </div>) : LoadingIndicator}
      </main>
      {schema &&
      <aside className={classes.inspector}>
        <SchemaInspector language={language}/>
      </aside>}
    </div>
  );
};
export default Editor;
