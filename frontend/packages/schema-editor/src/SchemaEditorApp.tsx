import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import './App.css';

import { store } from './store';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, UiSchemaNodes } from '@altinn/schema-model';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';
import { DatamodelMetadata } from 'app-shared/types/DatamodelMetadata';

export type SchemaEditorAppProps = {
  children: React.ReactNode;
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
  const [model, setModel] = useState(() => (jsonSchema ? buildUiSchema(jsonSchema) : []));
  const prevModelPathRef = useRef(modelPath);
  const prevModelRef = useRef(model);

  const saveInternalModel = useCallback(
    (newModel: UiSchemaNodes, saveAfterMs: number = AUTOSAVE_DEBOUNCE_INTERVAL) => {
      prevModelRef.current = newModel;
      setModel(newModel);
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(async () => {
        clearTimeout(autoSaveTimeoutRef.current);
        save({ modelPath, model: buildJsonSchema(newModel) });
      }, saveAfterMs);
    },
    [modelPath, save]
  );

  useEffect(() => {
    const autoSaveOnModelChange = async () => {
      if (prevModelPathRef.current === modelPath) return;

      const isExistingModel = datamodels.some(
        (item) => item.repositoryRelativeUrl === prevModelPathRef.current
      );
      if (!isExistingModel) {
        prevModelPathRef.current = modelPath;
        return;
      }

      clearTimeout(autoSaveTimeoutRef.current);
      save({ modelPath: prevModelPathRef.current, model: buildJsonSchema(prevModelRef.current) });

      prevModelPathRef.current = modelPath;
    };

    autoSaveOnModelChange();
  }, [datamodels, modelPath, save]);

  useEffect(() => {
    const newModel = jsonSchema ? buildUiSchema(jsonSchema) : [];
    prevModelRef.current = newModel;
    setModel(newModel);
  }, [jsonSchema]);

  const value = useMemo(
    () => ({ data: model, save: saveInternalModel }),
    [model, saveInternalModel]
  );

  return (
    <SchemaEditorAppContext.Provider value={value}>
      <Provider store={store}>{children}</Provider>
    </SchemaEditorAppContext.Provider>
  );
}
