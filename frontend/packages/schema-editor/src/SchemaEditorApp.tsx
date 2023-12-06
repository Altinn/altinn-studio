import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import './App.css';

import { store } from './store';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, SchemaModel, UiSchemaNodes } from '@altinn/schema-model';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export type SchemaEditorAppProps = {
  children?: React.ReactNode;
  datamodels: DatamodelMetadata[];
  modelPath?: string;
  jsonSchema: JsonSchema;
  save: (args: { modelPath: string; model: JsonSchema }) => void;
};

export function SchemaEditorApp({
  children,
  datamodels,
  modelPath,
  jsonSchema,
  save,
}: SchemaEditorAppProps) {
  const autoSaveTimeoutRef = useRef(undefined);
  const initialNodes = useMemo(() => (jsonSchema ? buildUiSchema(jsonSchema) : []), [jsonSchema]);
  const initialModel = SchemaModel.fromArray(initialNodes);
  const [model, setModel] = useState<SchemaModel>(initialModel);
  const prevModelPathRef = useRef(modelPath);
  const prevModelRef = useRef(model);
  const [selectedTypePointer, setSelectedTypePointer] = useState<string>(null);

  const saveInternalModel = useCallback(
    (newModel: SchemaModel, saveAfterMs: number = AUTOSAVE_DEBOUNCE_INTERVAL) => {
      prevModelRef.current = newModel;
      setModel(newModel);
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        clearTimeout(autoSaveTimeoutRef.current);
        const nodes: UiSchemaNodes = newModel.asArray();
        const schema: JsonSchema = buildJsonSchema(nodes);
        save({ modelPath, model: schema });
      }, saveAfterMs);
    },
    [modelPath, save]
  );

  useEffect(() => {
    const autoSaveOnModelChange = () => {
      if (prevModelPathRef.current === modelPath) return;

      const isExistingModel = datamodels.some(
        (item) => item.repositoryRelativeUrl === prevModelPathRef.current
      );
      if (!isExistingModel) {
        prevModelPathRef.current = modelPath;
        return;
      }

      clearTimeout(autoSaveTimeoutRef.current);
      const nodes: UiSchemaNodes = prevModelRef.current.asArray();
      const schema: JsonSchema = buildJsonSchema(nodes);
      save({ modelPath: prevModelPathRef.current, model: schema });

      prevModelPathRef.current = modelPath;
    };

    autoSaveOnModelChange();
  }, [datamodels, modelPath, save]);

  useEffect(() => {
    const newNodes = jsonSchema ? buildUiSchema(jsonSchema) : [];
    const newModel = SchemaModel.fromArray(newNodes);
    prevModelRef.current = newModel;
    setModel(newModel);
  }, [jsonSchema]);

  const value = useMemo(
    () => ({
      schemaModel: model,
      save: saveInternalModel,
      selectedTypePointer,
      setSelectedTypePointer
    }),
    [model, saveInternalModel, selectedTypePointer]
  );

  return (
    <SchemaEditorAppContext.Provider value={value}>
      <Provider store={store}>{children}</Provider>
    </SchemaEditorAppContext.Provider>
  );
}
