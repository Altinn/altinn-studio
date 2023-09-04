import React, { useCallback, useMemo } from 'react';
import { Provider } from 'react-redux';
import './App.css';
import { SchemaEditor } from './components/SchemaEditor';

import { store } from './store';
import '@digdir/design-system-tokens/brand/altinn/tokens.css';
import { SchemaEditorAppContext } from '@altinn/schema-editor/contexts/SchemaEditorAppContext';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { buildJsonSchema, buildUiSchema, UiSchemaNodes } from '@altinn/schema-model';

export type SchemaEditorAppProps = {
  modelName?: string;
  data: JsonSchema;
  save: (schema: JsonSchema) => void;
}

export function SchemaEditorApp({ modelName, data, save }: SchemaEditorAppProps) {
  const internalModel = useMemo(() => buildUiSchema(data), [data]);
  const saveInternalModel = useCallback((schema: UiSchemaNodes) => save(buildJsonSchema(schema)), [save]);
  return (
    <SchemaEditorAppContext.Provider value={{ data: internalModel, save: saveInternalModel }}>
      <Provider store={store}>
        <SchemaEditor modelName={modelName}/>
      </Provider>
    </SchemaEditorAppContext.Provider>
  );
}
