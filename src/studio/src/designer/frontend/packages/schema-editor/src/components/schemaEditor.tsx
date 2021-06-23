import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TabContext, TabList, TabPanel, TreeItem, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { AppBar, Grid } from '@material-ui/core';
import { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRefProperty, setSchemaName, addRootItem } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import AddPropertyModal from './AddPropertyModal';
import { dataMock } from '../mockData';
import { buildUISchema, getDomFriendlyID, getTranslation, getUiSchemaTreeFromItem } from '../utils';
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
  const sharedItems: UiSchemaItem[] = buildUISchema(dataMock.definitions, '#/definitions', true);
  const [addPropertyModalOpen, setAddPropertyModalOpen] = React.useState<boolean>(false);
  const [addPropertyPath, setAddPropertyPath] = React.useState<string>('');
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const selectedNodeId = useSelector((state: ISchemaState) => state.selectedNodeId);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.id.startsWith('#/definitions')));
  const properties = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.id.startsWith('#/properties/')));
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
      setTimeout(() => {
        const node = document.querySelector<HTMLElement>(`#${selectedNodeId}`);
        if (node) {
          node.focus();
          (node.firstChild as HTMLElement).click();
        }
      }, 50);
    }
  }, [selectedNodeId]);

  const onClickSaveJsonSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

  const onAddPropertyClick = (path: string) => {
    setAddPropertyPath(path);
    setAddPropertyModalOpen(true);
  };

  const onCloseAddPropertyModal = (property: UiSchemaItem) => {
    if (property && property.displayName) {
      const itemTree = getUiSchemaTreeFromItem(sharedItems, property);
      const newProp = {
        path: addPropertyPath,
        newKey: property.displayName,
        content: itemTree,
      };
      dispatch(addRefProperty(newProp));
    }

    setAddPropertyModalOpen(false);
  };

  const onCancelAddItemModal = () => {
    setAddPropertyModalOpen(false);
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
      <AddPropertyModal
        isOpen={addPropertyModalOpen}
        path={addPropertyPath}
        onClose={onCancelAddItemModal}
        onConfirm={onCloseAddPropertyModal}
        sharedTypes={sharedItems}
        title={getTranslation('add_property', language)}
      />

      <Grid
        container={true} direction='row'
        spacing={2}
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
                  defaultCollapseIcon={<ArrowDropDownIcon />}
                  defaultExpandIcon={<ArrowRightIcon />}
                >
                  {properties?.map((item: UiSchemaItem) => <SchemaItem
                    keyPrefix='properties'
                    key={item.id}
                    item={item}
                    nodeId={`${item.id}`}
                    language={language}
                    id={getDomFriendlyID(item.id)}
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
                  defaultCollapseIcon={<ArrowDropDownIcon />}
                  defaultExpandIcon={<ArrowRightIcon />}
                >
                  {definitions.map((def) => <SchemaItem
                    keyPrefix='definitions'
                    item={def}
                    key={def.id}
                    nodeId={`def-${def.id}`}
                    id={getDomFriendlyID(def.id)}
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
        <Grid item={true} xs={6}>
          <SchemaInspector onAddPropertyClick={onAddPropertyClick} language={language} />
        </Grid>
      </Grid>
    </div>
  );
};

export default SchemaEditor;
