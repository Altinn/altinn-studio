import React from 'react';
import { SchemaModel } from '@altinn/schema-model';
import { SchemaProperty } from './SchemaProperty';

export const renderSchemaPropertyList = (schema: SchemaModel, parentPointer?: string) => {
  const properties = parentPointer ? schema.getChildNodes(parentPointer) : schema.getRootProperties();
  return properties.length ? (
    <>
      {properties.map(({ pointer }) => (
        <SchemaProperty key={pointer} pointer={pointer} schema={schema} />
      ))}
    </>
  ) : null;
};
