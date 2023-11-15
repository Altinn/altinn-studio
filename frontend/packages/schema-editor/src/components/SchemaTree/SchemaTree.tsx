import React from 'react';
import { SchemaModel } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaPropertyList } from './renderSchemaPropertyList';

export interface SchemaTreeProps {
  schema: SchemaModel;
  pointer?: string;
}

export const SchemaTree = ({ schema, pointer }: SchemaTreeProps) => {
  return (
    <DragAndDropTree.Root emptyMessage={'asdasdasd'}>
      {renderSchemaPropertyList(schema, pointer)}
    </DragAndDropTree.Root>
  );
};
