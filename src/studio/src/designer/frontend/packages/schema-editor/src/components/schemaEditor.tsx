import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TabContext, TabList, TabPanel, TreeItem, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Grid } from '@material-ui/core';
import { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRootItem, setSchemaName } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import { getDomFriendlyID, getTranslation } from '../utils';
import SchemaInspector from './SchemaInspector';
import { SchemaTab } from './SchemaTab';

const useStyles = makeStyles(
  createStyles({
    root: {
      marginTop: 24,
      height: '100%',
    },
    treeView: {
      backgroundColor: 'white',
      boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
      minHeight: 200,
    },
    button: {
      marginLeft: 24,
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
  }),
);

export interface ISchemaEditor {
  schema: ISchema;
  onSaveSchema: (payload: any) => void;
  name?: string;
  language: ILanguage;
}

export const SchemaEditor = ({
  schema, onSaveSchema, name, language,
}: ISchemaEditor) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedNodeId = useSelector((state: ISchemaState) => state.selectedNodeId);
  const navigate = useSelector((state: ISchemaState) => state.navigate);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/definitions')));
  const properties = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.path.startsWith('#/properties/')));
  const [tabIndex, setTabIndex] = React.useState('0');

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
    if (selectedNodeId) {
      const tab = selectedNodeId.startsWith('definitions') ? '1' : '0';
      setTabIndex(tab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const onClickSaveJsonSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

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

  return (
    <div className={classes.root}>

      <button
        type='button' className={classes.button}
        onClick={onClickSaveJsonSchema}
      >{getTranslation('save_data_model', language)}
      </button>

      <Grid
        container={true} direction='row'
      >
        <Grid item={true} xs={6}>
          <div id='schema-editor' className={classes.treeView}>
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
                  multiSelect={false}
                  selected={selectedNodeId ?? ''}
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
                    nodeId='info'
                    icon={<i className='fa fa-plus'/>}
                    label={getTranslation('add_property', language)}
                    onClick={handleAddProperty}
                  />
                </TreeView>
              </TabPanel>
              <TabPanel value='1'>
                <TreeView
                  multiSelect={false}
                  selected={selectedNodeId ?? ''}
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
                    nodeId='info'
                    icon={<i className='fa fa-plus'/>}
                    label={getTranslation('add_property', language)}
                    onClick={handleAddDefinition}
                  />
                </TreeView>
              </TabPanel>
            </TabContext>

          </div>
        </Grid>
        <Grid item xs={1} />
        <Grid item={true} xs={5}>
          <SchemaInspector language={language} />
        </Grid>
      </Grid>
    </div>
  );
};

export default SchemaEditor;
