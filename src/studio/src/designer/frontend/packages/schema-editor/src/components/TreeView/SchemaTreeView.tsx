import React from 'react';
import classes from './SchemaTreeView.module.css';
import type { UiSchemaNode } from '@altinn/schema-model';
import { DndProvider } from 'react-dnd';
import { Expand, Next } from '@navikt/ds-icons';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SchemaItem } from './SchemaItem';
import { TreeView } from '@mui/lab';

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
        defaultCollapseIcon={<Expand />}
        defaultExpandIcon={<Next />}
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
