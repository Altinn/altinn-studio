import React from 'react';
import { SchemaModel } from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { renderSchemaPropertyList } from '../renderSchemaPropertyList';

export interface SchemaPropertyProps {
  pointer: string;
  schema: SchemaModel;
}

export const SchemaProperty = ({ pointer, schema }: SchemaPropertyProps) => {
  return (
    <DragAndDropTree.Item label={pointer} nodeId={pointer} emptyMessage={'asdasdasd'}>
      {renderSchemaPropertyList(schema, pointer)}
    </DragAndDropTree.Item>
  );
};
