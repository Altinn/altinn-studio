import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, UiSchemaNodes } from '@altinn/schema-model';
import { AUTOSAVE_DEBOUNCE_INTERVAL } from 'app-shared/constants';

export type SchemaEditorAppProps = {
  modelPath?: string;
  modelName?: string;
  jsonSchema: JsonSchema;
  save: (args: { modelPath: string; model: JsonSchema }) => void;
};

export function SchemaEditorApp({ modelPath, modelName, jsonSchema, save }: SchemaEditorAppProps) {
  const autoSaveTimeoutRef = useRef(undefined);
  const [model, setModel] = useState(() => buildUiSchema(jsonSchema));
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

      clearTimeout(autoSaveTimeoutRef.current);
      save({ modelPath: prevModelPathRef.current, model: buildJsonSchema(prevModelRef.current) });

      prevModelPathRef.current = modelPath;
    };

    autoSaveOnModelChange();
  }, [modelPath, save]);

  useEffect(() => {
    const newModel = buildUiSchema(jsonSchema);
    prevModelRef.current = newModel;
    setModel(newModel);
  }, [jsonSchema]);

  const value = useMemo(
    () => ({ data: model, save: saveInternalModel }),
    [model, saveInternalModel]
  );

  return (
    <SchemaEditorAppContext.Provider value={value}>
      <Provider store={store}>
        <SchemaEditor modelName={modelName} />
      </Provider>
    </SchemaEditorAppContext.Provider>
  );
}
