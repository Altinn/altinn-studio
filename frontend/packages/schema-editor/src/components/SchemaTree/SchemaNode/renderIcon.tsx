import React, { type ReactElement } from 'react';
import { isField, isObject, type SchemaModel } from '@altinn/schema-model';
import { NodeIcon } from '@altinn/schema-editor/components/NodeIcon';

export const renderIcon = (schemaModel: SchemaModel, pointer: string): ReactElement => {
  const node = schemaModel.getNode(pointer);
  if (isField(node) && isObject(node)) return null;
  else return <NodeIcon node={node} />;
};
