import React from 'react';
import { TreeView } from '@material-ui/lab';
import { ArrowDropDown, ArrowRight } from '@material-ui/icons';
import { SchemaItem } from './SchemaItem';
import { UiSchemaNode } from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import classes from './SchemaTreeView.module.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export interface SchemaTreeViewProps {
  editMode: boolean;
  expanded: any;
  items: UiSchemaNode[];
  onNodeToggle: any;
  selectedPointer: string;
  translate: (key: string) => string;
}

export const SchemaTreeView = ({
  editMode,
  expanded,
  items,
  onNodeToggle,
  selectedPointer,
  translate,
}: SchemaTreeViewProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <TreeView
        className={classes.treeView}
        multiSelect={false}
        selected={getDomFriendlyID(selectedPointer)}
        defaultCollapseIcon={<ArrowDropDown />}
        defaultExpandIcon={<ArrowRight />}
        expanded={expanded}
        onNodeToggle={onNodeToggle}
      >
        {items.map((item: UiSchemaNode, index: number) => (
          <SchemaItem
            index={index}
            editMode={editMode}
            isPropertiesView={true}
            selectedNode={item}
            key={item.pointer}
            translate={translate}
          />
        ))}
      </TreeView>
    </DndProvider>
  );
};
