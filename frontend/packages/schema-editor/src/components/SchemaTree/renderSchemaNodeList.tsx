import React from 'react';
import { SchemaNode } from './SchemaNode';
import type { SavableSchemaModel } from '../../classes/SavableSchemaModel';

export const renderSchemaNodeList = (
  schema: SavableSchemaModel,
  schemaParentPointer?: string,
  uniqueParentPointer?: string,
) => {
  const properties = schemaParentPointer
    ? schema.getChildNodes(schemaParentPointer)
    : schema.getRootProperties();
  return properties.length ? (
    <>
      {properties.map(({ schemaPointer }) => (
        <SchemaNode
          key={schemaPointer}
          schemaPointer={schemaPointer}
          uniqueParentPointer={uniqueParentPointer}
        />
      ))}
    </>
  ) : null;
};
