import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TreeItem, TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { Grid, IconButton, Menu, MenuItem } from '@material-ui/core';
import { ILanguage, ISchema, ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addRefProperty, setRootName, addProperty, addRootProperty } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import AddPropertyModal from './AddPropertyModal';
import { dataMock } from '../mockData';
import { buildUISchema, getDomFriendlyID, getTranslation, getUiSchemaTreeFromItem } from '../utils';
import SchemaInspector from './SchemaInspector';

const useStyles = makeStyles(
  createStyles({
    root: {
      marginTop: 24,
      height: '100%',
    },
    propertiesLabel: {
      display: 'flex',
      alignItems: 'center',
      padding: 8,
    },
    label: {
      flexGrow: 1,
    },
    tree: {
      flexGrow: 1,
    },
    button: {
      marginLeft: 24,
    },
    iconContainer: {
      background: '#022f51',
      textAlign: 'center',
      padding: '5px 0px 5px 0px',
      marginRight: 4,
      fontSize: '10px',
    },
    contextButton: {
      borderRadius: 60,
      margin: 0,
      padding: 10,
      display: 'none',
      '$properties :hover > &': {
        display: 'block',
      },
    },
    properties: {
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
  }),
);

export interface ISchemaEditor {
  schema: ISchema;
  onSaveSchema: (payload: any) => void;
  rootItemId?: string;
  language: ILanguage;
}

export const SchemaEditor = ({
  schema, onSaveSchema, rootItemId, language,
}: ISchemaEditor) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const sharedItems: UiSchemaItem[] = buildUISchema(dataMock.definitions, '#/definitions', true);
  const [addPropertyModalOpen, setAddPropertyModalOpen] = React.useState<boolean>(false);
  const [addPropertyPath, setAddPropertyPath] = React.useState<string>('');
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const selectedNodeId = useSelector((state :ISchemaState) => state.selectedNodeId);
  const definitions = useSelector((state: ISchemaState) => state.uiSchema.filter((d: UiSchemaItem) => d.id.startsWith('#/definitions')));

  React.useEffect(() => {
    dispatch(setRootName({ rootName: rootItemId }));
  }, [dispatch, rootItemId]);
  const [contextAnchor, setContextAnchor] = React.useState<any>(null);

  React.useEffect(() => {
    if (jsonSchema) {
      dispatch(setUiSchema({ rootElementPath: rootItemId }));
    }
  }, [dispatch, jsonSchema, rootItemId]);

  React.useEffect(() => {
    dispatch(setJsonSchema({ schema }));
  }, [dispatch, schema]);

  React.useEffect(() => {
    if (selectedNodeId) {
      const node = document.querySelector<HTMLElement>(`#${selectedNodeId}`);
      if (node) {
        node.focus();
        (node.firstChild as HTMLElement).click();
      }
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
  const handleContextMenuClick = (e: React.MouseEvent) => {
    setContextAnchor(e.currentTarget);
    e.stopPropagation();
  };
  const handleCloseContextMenu = (e: React.MouseEvent) => {
    setContextAnchor(null);
    e.stopPropagation();
  };
  const handleAddProperty = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextAnchor(null);
    dispatch(addRootProperty({
      name: 'name',
    }));
  };
  const renderPropertiesLabel = () => (
    <div className={classes.propertiesLabel}>
      <div className={classes.label}>
        <span className={classes.iconContainer}>
          <i className='fa fa-datamodel-properties' style={{ color: 'white', textAlign: 'center' }} />
        </span> {getTranslation('schema_editor.properties', language)}
      </div>
      <IconButton
        className={classes.contextButton}
        aria-controls='simple-menu'
        aria-haspopup='true'
        id='open-context-menu-button'
        onClick={handleContextMenuClick}
      ><i className='fa fa-ellipsismenu'/>
      </IconButton>
      <Menu
        id='root-properties-context-menu'
        anchorEl={contextAnchor}
        open={Boolean(contextAnchor)}
        onClose={handleCloseContextMenu}
      >
        <MenuItem onClick={handleAddProperty}><i className='fa fa-plus'/>{getTranslation('schema_editor.add_property', language)}</MenuItem>
      </Menu>
    </div>);

  const properties = uiSchema.filter((i) => i.id.includes('#/properties/'));
  return (
    <div className={classes.root}>
      <Grid container={true} direction='row'>
        <Grid item={true} xs={7}>
          <div id='schema-editor' className={classes.root}>
            <button
              type='button' className={classes.button}
              onClick={onClickSaveJsonSchema}
            >{getTranslation('schema_editor.save_data_model', language)}
            </button>
            <AddPropertyModal
              isOpen={addPropertyModalOpen}
              path={addPropertyPath}
              onClose={onCancelAddItemModal}
              onConfirm={onCloseAddPropertyModal}
              sharedTypes={sharedItems}
              title={getTranslation('schema_editor.add_property', language)}
            />

            <TreeView
              multiSelect={false}
              className={classes.tree}
              defaultExpanded={['properties', 'definitions']}
              defaultCollapseIcon={<ArrowDropDownIcon />}
              defaultExpandIcon={<ArrowRightIcon />}
            >
              <TreeItem
                id='properties'
                nodeId='properties'
                className={classes.properties}
                label={renderPropertiesLabel()}
              >
                { properties?.map((item: UiSchemaItem) => <SchemaItem
                  keyPrefix='properties'
                  key={item.id}
                  item={item}
                  nodeId={`${item.id}`}
                />)}
              </TreeItem>
              <TreeItem nodeId='info' label='info' />
              <TreeItem nodeId='definitions' label='definitions'>
                { definitions.map((def) => <SchemaItem
                  keyPrefix='definitions'
                  item={def}
                  key={def.id}
                  nodeId={`def-${def.id}`}
                  id={getDomFriendlyID(def.id)}
                />)}
              </TreeItem>
            </TreeView>
          </div>
        </Grid>
        <Grid item={true} xs={5}>
          <SchemaInspector onAddPropertyClick={onAddPropertyClick} language={language} />
        </Grid>
      </Grid>
    </div>
  );
};

export default SchemaEditor;
