import React from 'react';
import { SchemaNode } from './SchemaNode';
import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';

export const renderSchemaNodeList = (schema: SavableSchemaModel, parentPointer?: string) => {
  const properties = parentPointer ? schema.getChildNodes(parentPointer) : schema.getRootProperties();
  return properties.length ? (
    <>
      {properties.map(({ pointer }) => (
        <SchemaNode key={pointer} pointer={pointer} />
      ))}
    </>
  ) : null;
};
