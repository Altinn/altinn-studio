import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import ArrowRightIcon from '@material-ui/icons/ArrowRight';
import { TreeView } from '@material-ui/lab';
import { useSelector, useDispatch } from 'react-redux';
import { ISchemaState } from './features/editor/schemaEditorSlice';
import { setUiSchema, setJsonSchema } from './features/editor/schemaEditorSlice';
import SchemaItem from './SchemaItem';

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 264,
      flexGrow: 1,
      maxWidth: 1200,
      marginTop: 24,
      marginLeft: 24,
    },
  }),
);

export const SchemaEditor = ({ setValue }: any) => {
  const classes = useStyles();
  const dispatch = useDispatch();

  const rootItem = useSelector((state: ISchemaState) => state.uiSchema[0]);
  const data = useSelector((state: ISchemaState) => state.schema);
  const root = useSelector((state: ISchemaState) => state.rootName);
  
  React.useEffect(() => {
    dispatch(setUiSchema({}));
  }, [dispatch]);

  const stringify = () => {
    console.log(JSON.stringify(data));
  }

  const onClickSetJsonSchema = () => {
    dispatch(setJsonSchema({}));
  }

  return (
    <>
    {rootItem &&
    <div className={classes.root}>
      <button onClick={onClickSetJsonSchema}>Save data model</button>
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
    {/* <button onClick={stringify}>Stringify</button> */}
    </div>}
    </>
  )
}

export default SchemaEditor