import type { ReactElement } from 'react';
import React from 'react';
import type { SchemaModel } from '@altinn/schema-model/index';
import { isField, isObject } from '@altinn/schema-model/index';
import { NodeIcon } from '@altinn/schema-editor/components/NodeIcon';

export const renderIcon = (schemaModel: SchemaModel, schemaPointer: string): ReactElement => {
  const node = schemaModel.getNodeBySchemaPointer(schemaPointer);
  if (isField(node) && isObject(node)) return null;
  else return <NodeIcon node={node} />;
};
