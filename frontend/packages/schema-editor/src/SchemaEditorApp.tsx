import React, { useMemo, useState } from 'react';
import './App.css';

import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import {
  SchemaEditorAppContext,
  SchemaEditorAppContextProps
} from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, SchemaModel } from '@altinn/schema-model';
import { SchemaEditor } from '@altinn/schema-editor/components/SchemaEditor';

export type SchemaEditorAppProps = {
  jsonSchema: JsonSchema;
  save: (model: JsonSchema) => void;
};

export function SchemaEditorApp({
  jsonSchema,
  save,
}: SchemaEditorAppProps) {
  const [selectedTypePointer, setSelectedTypePointer] = useState<string>(null);
  const [selectedNodePointer, setSelectedNodePointer] = useState<string>(null);

  const value = useMemo<SchemaEditorAppContextProps>(
    () => ({
      schemaModel: convertJsonSchemaToInternalModel(jsonSchema),
      save: (model: SchemaModel) => save(convertInternalModelToJsonSchema(model)),
      selectedTypePointer,
      setSelectedTypePointer,
      selectedNodePointer,
      setSelectedNodePointer,
    }),
    [jsonSchema, save, selectedTypePointer, selectedNodePointer]
  );

  return (
    <SchemaEditorAppContext.Provider value={value}>
      <SchemaEditor/>
    </SchemaEditorAppContext.Provider>
  );
}

const convertJsonSchemaToInternalModel = (jsonSchema: JsonSchema): SchemaModel =>
  SchemaModel.fromArray(buildUiSchema(jsonSchema));

const convertInternalModelToJsonSchema = (model: SchemaModel): JsonSchema =>
  buildJsonSchema(model.asArray());
