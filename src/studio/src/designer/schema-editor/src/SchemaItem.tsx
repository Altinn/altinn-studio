import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import TreeItem, { TreeItemProps } from '@material-ui/lab/TreeItem';
import Typography from '@material-ui/core/Typography';
import { InputField } from './components/InputField';
import { setKey, setValue, addItem, addProperty } from './features/editor/schemaEditorSlice';
import { useDispatch } from 'react-redux';

declare module 'csstype' {
  interface Properties {
    '--tree-view-color'?: string;
    '--tree-view-bg-color'?: string;
  }
}

type StyledTreeItemProps = TreeItemProps & {
  bgColor?: string;
  color?: string;
  labelInfo?: string;
  labelText: string;
  schemaPath: string;
  uiPath: string;
  content: any[];
  setValue?: any;
  typeRef?: string;
};

const useStyles = makeStyles({
  root: {
    height: 216,
    flexGrow: 1,
    maxWidth: 800,
  },
  labelRoot: {
    display: 'flex',
    alignItems: 'left',
    padding: 12,
  },
  label: {
    fontSize: '16',
    fontWeight: 'bold',
    paddingRight: 12,
  },
  typeRef: {
    fontSize: 16,
    paddingRight: 24,
  }
});

function SchemaItem(props: StyledTreeItemProps) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const { labelText, labelInfo, color, bgColor, ...other } = props;

  const onAddChildClick = (event: any) => {
    dispatch(addProperty({
      path: props.uiPath,
      key: 'newProp',
      value: 'value'}));
    event.stopPropagation();
  }

  const onAddSiblingClick = (event: any) => {
    dispatch(addItem({
      path: `${props.uiPath.replace(`/${labelText}`, '')}`,
      addAfter: labelText,
      newKey: 'test',
    }));
    event.preventDefault();
  }

  const onChangeValue = (path: string, value: any) => {
    dispatch(setValue({path, value}));
  }

  const onChangeKey = (path: string, oldKey: string, newKey: string) => {
    dispatch(setKey({path, oldKey, newKey}))
  }

  return (
    <TreeItem
      label={
        <div className={classes.labelRoot}>
          <Typography className={classes.label} variant='body1'>
            {labelText}
          </Typography>
          {props.typeRef &&
            <Typography className={classes.typeRef} variant='body1'>
              {` :  ${props.typeRef.replace('#/definitions/', '')}`}
            </Typography>
          }
          <Typography variant="button" color="inherit">
            <button title='Add' onClick={onAddChildClick}>Add</button>
          </Typography>
          <Typography variant="button" color="inherit">
            <button title='AddSib' onClick={onAddSiblingClick}>Add s</button>
          </Typography>
        </div>
      }
      {...other}
    >
      {props.content.map((item: any) => {
        if (Array.isArray(item.value)) {
          return (
            <SchemaItem
              labelText={item.id}
              schemaPath={`${item.schemaPath}/${item.id}`}
              uiPath={`${item.uiPath}/${item.id}`}
              nodeId={`${item.uiPath}/${item.id}`}
              content={item.value}
              typeRef={item.$ref}
            />
          );
        }
        return (
          <InputField
            value={item.value}
            label={item.id}
            fullPath={`${item.uiPath}/${item.id}`}
            onChangeValue={onChangeValue}
            onChangeKey={onChangeKey}
          />
        );
      })}
    </TreeItem>
  );
}

export default SchemaItem;
