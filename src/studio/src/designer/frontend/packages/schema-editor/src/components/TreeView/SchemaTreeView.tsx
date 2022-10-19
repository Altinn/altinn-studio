import React from 'react';
import { TreeView } from '@mui/lab';
import { ArrowDropDown, ArrowRight } from '@mui/icons-material';
import { SchemaItem } from './SchemaItem';
import { UiSchemaNode } from '@altinn/schema-model';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import classes from './SchemaTreeView.module.css';

export interface SchemaTreeViewProps {
  editMode: boolean;
  expanded: any;
  items: UiSchemaNode[];
  onNodeToggle: any;
  selectedPointer: string;
  isPropertiesView: boolean;
  translate: (key: string) => string;
}

export const SchemaTreeView = ({
  editMode,
  expanded,
  items,
  onNodeToggle,
  selectedPointer,
  translate,
  isPropertiesView,
}: SchemaTreeViewProps) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <TreeView
        className={classes.treeView}
        multiSelect={false}
        selected={selectedPointer}
        defaultCollapseIcon={<ArrowDropDown />}
        defaultExpandIcon={<ArrowRight />}
        expanded={expanded}
        onNodeToggle={onNodeToggle}
      >
        {items.map((item: UiSchemaNode, index: number) => (
          <SchemaItem
            index={index}
            editMode={editMode}
            isPropertiesView={isPropertiesView}
            selectedNode={item}
            key={item.pointer}
            translate={translate}
          />
        ))}
      </TreeView>
    </DndProvider>
  );
};
