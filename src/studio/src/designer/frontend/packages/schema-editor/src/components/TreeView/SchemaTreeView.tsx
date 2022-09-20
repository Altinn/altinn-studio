import { TreeView } from '@material-ui/lab';
import { getDomFriendlyID } from '../../utils/schema';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { UiSchemaItem } from '../../types';
import { SchemaItem } from './SchemaItem';
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

export interface SchemaTreeViewProps {
  editMode: boolean;
  expanded: any;
  items: UiSchemaItem[];
  translate: (key: string) => string;
  onNodeToggle: any;
  selectedNode: string;
}
const useStyles = makeStyles({
  treeView: {
    flexGrow: 1,
    overflow: 'auto',
  },
});
export const SchemaTreeView = ({
  items,
  editMode,
  expanded,
  translate,
  selectedNode,
  onNodeToggle,
}: SchemaTreeViewProps) => {
  const classes = useStyles();
  return (
    <TreeView
      className={classes.treeView}
      multiSelect={false}
      selected={getDomFriendlyID(selectedNode)}
      defaultCollapseIcon={<ArrowDropDown />}
      defaultExpandIcon={<ArrowRight />}
      expanded={expanded}
      onNodeToggle={onNodeToggle}
    >
      {items?.map((item: UiSchemaItem) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={true}
          item={item}
          key={item.path}
          translate={translate}
        />
      ))}
    </TreeView>
  );
};
