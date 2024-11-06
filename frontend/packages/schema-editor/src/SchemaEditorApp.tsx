import React, { useMemo } from 'react';
import './App.css';

import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import type { SchemaEditorAppContextProps } from './contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from './contexts/SchemaEditorAppContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, SchemaModel } from '@altinn/schema-model';
import { SchemaEditor } from './components/SchemaEditor';
import { useDataModelContext } from '@altinn/schema-editor/contexts/DataModelToolbarContext';

export type SchemaEditorAppProps = {
  jsonSchema: JsonSchema;
  save: (model: JsonSchema) => void;
};

export function SchemaEditorApp({ jsonSchema, save }: SchemaEditorAppProps) {
  const {
    selectedTypePointer,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
    selectedModelName,
  } = useDataModelContext();

  const value = useMemo<SchemaEditorAppContextProps>(
    () => ({
      schemaModel: convertJsonSchemaToInternalModel(jsonSchema),
      save: (model: SchemaModel) => save(convertInternalModelToJsonSchema(model)),
      selectedTypePointer,
      setSelectedTypePointer,
      selectedUniquePointer,
      setSelectedUniquePointer,
      name: selectedModelName,
    }),
    [
      jsonSchema,
      selectedTypePointer,
      setSelectedTypePointer,
      selectedUniquePointer,
      setSelectedUniquePointer,
      selectedModelName,
      save,
    ],
  );

  return (
    <SchemaEditorAppContext.Provider value={value}>
      <SchemaEditor />
    </SchemaEditorAppContext.Provider>
  );
}

const convertJsonSchemaToInternalModel = (jsonSchema: JsonSchema): SchemaModel =>
  SchemaModel.fromArray(buildUiSchema(jsonSchema));

const convertInternalModelToJsonSchema = (model: SchemaModel): JsonSchema =>
  buildJsonSchema(model.asArray());
