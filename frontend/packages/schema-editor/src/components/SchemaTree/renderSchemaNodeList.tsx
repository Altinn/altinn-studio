import React from 'react';
import { SchemaModel } from '@altinn/schema-model';
import { SchemaNode } from './SchemaNode';

export const renderSchemaNodeList = (schema: SchemaModel, parentPointer?: string) => {
  const properties = parentPointer ? schema.getChildNodes(parentPointer) : schema.getRootProperties();
  return properties.length ? (
    <>
      {properties.map(({ pointer }) => (
        <SchemaNode key={pointer} pointer={pointer} schema={schema} />
      ))}
    </>
  ) : null;
};
