import React from 'react';
import { UiSchemaNodes } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { SchemaPropertyList } from '@altinn/schema-editor/components/SchemaTree/SchemaPropertyList';

export interface SchemaTreeProps {
  schema: UiSchemaNodes;
  rootPointer: string;
}

export const SchemaTree = ({ schema, rootPointer }: SchemaTreeProps) => {
  console.log(schema);
  return (
    <DragAndDropTree.Root>
      <SchemaPropertyList schema={schema} parentPointer={rootPointer} />
    </DragAndDropTree.Root>
  );
};
