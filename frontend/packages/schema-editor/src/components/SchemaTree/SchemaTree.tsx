import React from 'react';
import { UiSchemaNodes } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';

export interface SchemaTreeProps {
  nodes: UiSchemaNodes;
}

export const SchemaTree = ({ nodes }: SchemaTreeProps) => {
  console.log(nodes);
  return (
    <DragAndDropTree.Provider onAdd={console.log} onMove={console.log} rootId='#'>
      <DragAndDropTree.Root></DragAndDropTree.Root>
    </DragAndDropTree.Provider>
  );
};
