import React from 'react';
import { getChildPropertiesByPointer, UiSchemaNodes } from '@altinn/schema-model';
import { SchemaProperty } from './SchemaProperty';

export interface SchemaPropertyListProps {
  schema: UiSchemaNodes;
  parentPointer: string;
}

export const SchemaPropertyList = ({ schema, parentPointer }: SchemaPropertyListProps) => {
  const properties = getChildPropertiesByPointer(schema, parentPointer);
  return (
    <>
      {properties.map(({ pointer }) => (
        <SchemaProperty key={pointer} pointer={pointer} schema={schema} />
      ))}
    </>
  );
};
