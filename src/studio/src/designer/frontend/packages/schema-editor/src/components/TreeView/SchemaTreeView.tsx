import React from 'react';
import { TreeView } from '@material-ui/lab';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { SchemaItem } from './SchemaItem';
import { makeStyles } from '@material-ui/core/styles';
import { UiSchemaNode } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';

export interface SchemaTreeViewProps {
  editMode: boolean;
  expanded: any;
  items: UiSchemaNode[];
  translate: (key: string) => string;
  onNodeToggle: any;
  selectedPointer: string;
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
  selectedPointer,
  onNodeToggle,
}: SchemaTreeViewProps) => {
  const classes = useStyles();
  return (
    <TreeView
      className={classes.treeView}
      multiSelect={false}
      selected={getDomFriendlyID(selectedPointer)}
      defaultCollapseIcon={<ArrowDropDown />}
      defaultExpandIcon={<ArrowRight />}
      expanded={expanded}
      onNodeToggle={onNodeToggle}
    >
      {items?.map((item: UiSchemaNode) => (
        <SchemaItem editMode={editMode} isPropertiesView={true} item={item} key={item.pointer} translate={translate} />
      ))}
    </TreeView>
  );
};
