import React from 'react';
import {
  FieldType,
  getChildPropertiesByPointer,
  getNodeByPointer,
  UiSchemaNodes,
} from '@altinn/schema-model';
import { DragAndDropTree } from 'app-shared/components/DragAndDropTree';
import { SchemaPropertyList } from '@altinn/schema-editor/components/SchemaTree/SchemaPropertyList';

export interface SchemaPropertyProps {
  pointer: string;
  schema: UiSchemaNodes;
}

export const SchemaProperty = ({ pointer, schema }: SchemaPropertyProps) => {
  return (
    <DragAndDropTree.Item label={pointer} nodeId={pointer}>
      <SchemaPropertyList schema={schema} parentPointer={pointer} />
    </DragAndDropTree.Item>
  );
};

const renderChildren = (schema: UiSchemaNodes, pointer: string) => {
  const node = getNodeByPointer(schema, pointer);
  if (node.fieldType !== FieldType.Object) return;
  const childProperties = getChildPropertiesByPointer(schema, pointer);
  if (!childIds.length) return <EmptyGroupContent />;
  else return <FormItemList layout={layout} parentId={id} />;
};
