import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema, addProperty, addRootItem, setRootName } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';
import AddPropertyModal from './AddPropertyModal';
import { dataMock } from '../mockData';
import { buildUISchema, getUiSchemaTreeFromItem } from '../utils';

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 264,
      flexGrow: 1,
      maxWidth: 1200,
      marginTop: 24,
    },
    button: {
      marginLeft: 24,
    },
  }),
);

export interface ISchemaEditor {
  schema: any;
  onSaveSchema: (payload: any) => void;
  rootItemId?: string;
}

export const SchemaEditor = ({
  schema, onSaveSchema, rootItemId,
}: ISchemaEditor) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const sharedItems: UiSchemaItem[] = buildUISchema(dataMock.definitions, '#/definitions', true);

  const [rootItem, setRootItem] = React.useState<UiSchemaItem>(undefined as unknown as UiSchemaItem);
  const [addPropertyModalOpen, setAddPropertyModalOpen] = React.useState<boolean>(false);
  const [addPropertyPath, setAddPropertyPath] = React.useState<string>('');
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);
  const rootItemName = useSelector((state: ISchemaState) => state.rootName);

  React.useEffect(() => {
    dispatch(setRootName({ rootName: rootItemId }));
  }, [dispatch, rootItemId]);

  React.useEffect(() => {
    if (rootItemName && uiSchema && Object.keys(uiSchema).length > 0) {
      const item = uiSchema.find((i) => i.id === rootItemName);
      setRootItem(item);
    }
  }, [uiSchema, rootItemName]);

  React.useEffect(() => {
    if (jsonSchema) {
      dispatch(setUiSchema({ rootElementPath: rootItemId }));
    }
  }, [dispatch, jsonSchema, rootItemId]);

  React.useEffect(() => {
    dispatch(setJsonSchema({ schema }));
  }, [dispatch, schema]);

  const onClickSaveJsonSchema = () => {
    dispatch(updateJsonSchema({ onSaveSchema }));
  };

  const onAddPropertyClick = (path: string) => {
    setAddPropertyPath(path);
    setAddPropertyModalOpen(true);
  };

  const onCloseAddPropertyModal = (property: any) => {
    if (property) {
      const itemTree = getUiSchemaTreeFromItem(sharedItems, property);
      const newProp = {
        path: addPropertyPath,
        newKey: property.name,
        content: itemTree,
      };
      dispatch(addProperty(newProp));
    }

    setAddPropertyModalOpen(false);
  };

  const onAddRootItemClick = () => {
    setAddPropertyPath('#/');
    setAddPropertyModalOpen(true);
  };

  const onCloseAddRootItemModal = (property: any) => {
    if (property) {
      const itemTree = getUiSchemaTreeFromItem(sharedItems, property);
      dispatch(addRootItem({ itemsToAdd: itemTree }));
      setAddPropertyModalOpen(false);
    }
  };

  return (
    <>
      {uiSchema && uiSchema.length > 0 &&
      <div id='schema-editor' className={classes.root}>
        <button
          type='button' className={classes.button}
          onClick={onClickSaveJsonSchema}
        >Save data model
        </button>
        <AddPropertyModal
          isOpen={addPropertyModalOpen}
          path={addPropertyPath}
          onClose={onCloseAddPropertyModal}
          sharedTypes={sharedItems}
          title='Add property'
        />
        <TreeView
          className={classes.root}
          defaultExpanded={['1']}
          defaultCollapseIcon={<ArrowDropDownIcon />}
          defaultExpandIcon={<ArrowRightIcon />}
        >
          {rootItem ?
            <SchemaItem
              item={rootItem}
              nodeId={rootItem.id}
              onAddPropertyClick={onAddPropertyClick}
            />
            :
            uiSchema.map((item) => {
              return (
                <SchemaItem
                  key={item.id}
                  item={item}
                  nodeId={item.id}
                  onAddPropertyClick={onAddPropertyClick}
                />
              );
            })}
        </TreeView>
      </div>
      }
      {uiSchema && uiSchema.length === 0 &&
      <div id='schema-editor' className={classes.root}>
        <button
          type='button' className={classes.button}
          onClick={onAddRootItemClick}
        >Add root item
        </button>
        <AddPropertyModal
          isOpen={addPropertyModalOpen}
          path={addPropertyPath}
          onClose={onCloseAddRootItemModal}
          sharedTypes={sharedItems}
          title='Add root item'
        />
      </div>
      }
    </>
  );
};

export default SchemaEditor;
