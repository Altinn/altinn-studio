import * as React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TabContext, TabList, TabPanel, TreeItem, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar } from '@material-ui/core';
import { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRootItem, setSchemaName } from '../features/editor/schemaEditorSlice';
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
export interface IEditorRef {
  onClickSaveJsonSchema: () => void;
}

export const Editor = React.forwardRef((props: IEditorProps, ref: React.Ref<IEditorRef>) => {
  const {
    Toolbar, LoadingIndicator, schema, onSaveSchema, name, language,
  } = props;

  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedTreeNode = useSelector((state: ISchemaState) => state.selectedTreeNodeId);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/definitions')));
  const properties = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/properties/')));
  const [tabIndex, setTabIndex] = React.useState('0');

  React.useImperativeHandle(ref, () => ({ onClickSaveJsonSchema }));

  function onClickSaveJsonSchema() {
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

  React.useEffect(() => {
    if (selectedTreeNode) {
      const tab = selectedTreeNode.startsWith('definitions') ? '1' : '0';
      setTabIndex(tab);
    }
  }, [selectedTreeNode]);

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
        </section>
        {schema ? (
          <div id='schema-editor' className={classes.editor}>
            <TabContext value={tabIndex}>
              <AppBar
                position='static' color='default'
                className={classes.appBar}
              >
                <TabList
                  onChange={(e, v) => setTabIndex(v)}
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
                  selected={selectedTreeNode ?? ''}
                  defaultCollapseIcon={<ArrowDropDownIcon />}
                  defaultExpandIcon={<ArrowRightIcon />}
                >
                  {properties?.map((item: UiSchemaItem) => <SchemaItem
                    keyPrefix='properties'
                    key={item.path}
                    item={item}
                    nodeId={getDomFriendlyID(item.path)}
                    id={getDomFriendlyID(item.path)}
                    language={language}
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
                  selected={selectedTreeNode ?? ''}
                  defaultCollapseIcon={<ArrowDropDownIcon />}
                  defaultExpandIcon={<ArrowRightIcon />}
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
});
export default Editor;
