import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { ISchemaState } from '../types';
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
}

export const SchemaEditor = ({ schema, onSaveSchema }: ISchemaEditor) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const rootItem = useSelector((state: ISchemaState) => state.uiSchema[0]);
  const jsonSchema = useSelector((state: ISchemaState) => state.schema);
  
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
    {rootItem &&
    <div className={classes.root}>
      <button className={classes.button} onClick={onClickSaveJsonSchema}>Save data model</button>
      <TreeView
        className={classes.root}
        defaultExpanded={['1']}
        defaultCollapseIcon={<ArrowDropDownIcon />}
        defaultExpandIcon={<ArrowRightIcon />}
      >
        <SchemaItem
          item={rootItem}
          nodeId={rootItem.id}
        />
      </TreeView>
    </div>}
    </>
  )
}

export default SchemaEditor