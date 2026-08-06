import { useMemo, useState } from 'react';
import './App.css';
import type { SchemaEditorAppContextProps } from './contexts/SchemaEditorAppContext';
import { SchemaEditorAppContext } from './contexts/SchemaEditorAppContext';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { buildJsonSchema, buildUiSchema, SchemaModel } from '@altinn/schema-model';
import { SchemaEditor } from './components/SchemaEditor';

export type SchemaEditorAppProps = {
  jsonSchema: JsonSchema;
  name: string;
  save: (model: JsonSchema) => void;
  prefillConfig?: PrefillConfig;
  savePrefillConfig?: (prefillConfig: PrefillConfig) => void;
};

export function SchemaEditorApp({
  jsonSchema,
  name,
  save,
  prefillConfig,
  savePrefillConfig,
}: SchemaEditorAppProps) {
  const [selectedTypePointer, setSelectedTypePointer] = useState<string>(null);
  const [selectedUniquePointer, setSelectedUniquePointer] = useState<string>(null);

  const value = useMemo<SchemaEditorAppContextProps>(
    () => ({
      schemaModel: convertJsonSchemaToInternalModel(jsonSchema),
      save: (model: SchemaModel) => save(convertInternalModelToJsonSchema(model)),
      selectedTypePointer,
      setSelectedTypePointer,
      selectedUniquePointer,
      setSelectedUniquePointer,
      name,
      prefillConfig: prefillConfig ?? {},
      savePrefillConfig: savePrefillConfig ?? (() => {}),
    }),
    [
      jsonSchema,
      save,
      selectedTypePointer,
      selectedUniquePointer,
      name,
      prefillConfig,
      savePrefillConfig,
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
