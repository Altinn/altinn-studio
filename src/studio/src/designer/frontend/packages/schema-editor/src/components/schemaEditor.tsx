import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { ISchemaState, UiSchemaItem } from '../types';
import { setUiSchema, setJsonSchema, updateJsonSchema } from '../features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 264,
      flexGrow: 1,
      maxWidth: 1200,
      marginTop: 24,
      marginLeft: 48,
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

export const SchemaEditor = ({ schema, onSaveSchema, rootItemId }: ISchemaEditor) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const [rootItem, setRootItem] = React.useState<UiSchemaItem>(undefined as unknown as UiSchemaItem);
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  const uiSchema = useSelector((state: ISchemaState) => state.uiSchema);

  React.useEffect(() => {
    if (rootItemId && uiSchema && Object.keys(uiSchema).length > 0) {
      const item = uiSchema.find((i) => i.id === rootItemId);
      setRootItem(item);
    }
  }, [rootItemId, uiSchema]);

  // React.useEffect(() => {
  //   const getRootItems = () => {
  //     const result: UiSchemaItem[] = [];
  //     const ids: string[] = Object.keys(jsonSchema);
  //     ids.forEach((id) => {
  //       const uiSchemaItem = uiSchema.find((item) => item.id === `#/${id}`);
  //       if (uiSchemaItem) {
  //         result.push(uiSchemaItem);
  //       }
  //     });
  
  //     return result;
  //   }

  //   if (jsonSchema && Object.keys(jsonSchema).length > 0 && uiSchema && Object.keys(uiSchema).length > 0) {
  //     setRootItems(getRootItems())
  //   }
  // }, [jsonSchema, uiSchema]);
  
  React.useEffect(() => {
    if (jsonSchema && Object.keys(jsonSchema).length > 0) {
      dispatch(setUiSchema({}));
    }
  }, [dispatch, jsonSchema]);

  React.useEffect(() => {
    dispatch(setJsonSchema({schema}));
  }, [dispatch, schema]);

  const onClickSaveJsonSchema = () => {
    dispatch(updateJsonSchema({onSaveSchema}));
  }

  return (
    <>
    {uiSchema && uiSchema.length > 0 &&
    <div className={classes.root}>
      <button className={classes.button} onClick={onClickSaveJsonSchema}>Save data model</button>
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
          />
        :
        uiSchema.map((item) => {
          return (
            <SchemaItem
              item={item}
              nodeId={item.id}
            />
          );
        })}
      </TreeView>
    </div>}
    </>
  )
}

export default SchemaEditor