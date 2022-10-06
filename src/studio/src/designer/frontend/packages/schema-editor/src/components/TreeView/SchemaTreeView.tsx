import React from 'react';
import { TreeView } from '@material-ui/lab';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { SchemaItem } from './SchemaItem';
import { UiSchemaNode } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './SchemaTreeView.module.css';

export interface SchemaTreeViewProps {
  editMode: boolean;
  expanded: any;
  items: UiSchemaNode[];
  translate: (key: string) => string;
  onNodeToggle: any;
  selectedPointer: string;
}

export const SchemaTreeView = ({
  items,
  editMode,
  expanded,
  translate,
  selectedPointer,
  onNodeToggle,
}: SchemaTreeViewProps) => {
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
      {items.map((item: UiSchemaNode) => (
        <SchemaItem
          editMode={editMode}
          isPropertiesView={true}
          selectedNode={item}
          key={item.pointer}
          translate={translate}
        />
      ))}
    </TreeView>
  );
};
