import * as React from 'react';
import { makeStyles, createStyles } from '@material-ui/core/styles';
import { TreeView, TreeItemProps } from '@material-ui/lab';
import { buildSimpleTreeView, MinusSquare, PlusSquare, CloseSquare } from './utils';

export interface ISchemaEditor {
  data: any;
  onChange: (value: string, path: string) => void;
}

const useStyles = makeStyles(
  createStyles({
    root: {
      height: 264,
      flexGrow: 1,
      maxWidth: 800,
    },
  }),
);

export const SchemaEditor = ({data, onChange}: ISchemaEditor) => {
  const classes = useStyles();

  return (
    <TreeView
      className={classes.root}
      defaultExpanded={['1']}
      defaultCollapseIcon={<MinusSquare />}
      defaultExpandIcon={<PlusSquare />}
      defaultEndIcon={<CloseSquare />}
    >
      {buildSimpleTreeView(data, '#', onChange)}
    </TreeView>
  )
}