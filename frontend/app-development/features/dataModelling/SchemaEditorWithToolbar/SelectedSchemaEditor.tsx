import React, { useCallback, useRef, useState } from 'react';
import { useSchemaQuery } from '../../../hooks/queries';
import { useSchemaMutation } from '../../../hooks/mutations';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { useOnUnmount } from 'app-shared/hooks/useOnUnmount';
import type {
  DataModelMetadataJson,
  DataModelMetadataXsd,
} from 'app-shared/types/DataModelMetadata';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mergeJsonAndXsdData } from 'app-development/utils/metadataUtils';
import { extractFilename, removeSchemaExtension } from 'app-shared/utils/filenameUtils';
export interface SelectedSchemaEditorProps {
  modelPath: string;
}

export const SelectedSchemaEditor = ({ modelPath }: SelectedSchemaEditorProps) => {
  const { data, status, error } = useSchemaQuery(modelPath);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return (
        <StudioPageSpinner
          showSpinnerTitle={false}
          spinnerTitle={t('schema_editor.loading_page')}
        />
      );

    case 'error':
      return (
        <StudioCenter>
          <Alert severity='danger'>
            <Paragraph>{t('general.fetch_error_message')}</Paragraph>
            <Paragraph>{t('general.error_message_with_colon')}</Paragraph>
            <ErrorMessage>
              {error.response?.data?.customErrorMessages[0] ?? error.message}
            </ErrorMessage>
          </Alert>
        </StudioCenter>
      );

    case 'success':
      return <SchemaEditorWithDebounce jsonSchema={data} modelPath={modelPath} key={modelPath} />;
  }
};

interface SchemaEditorWithDebounceProps {
  jsonSchema: JsonSchema;
  modelPath: string;
}

const SchemaEditorWithDebounce = ({ jsonSchema, modelPath }: SchemaEditorWithDebounceProps) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useSchemaMutation();
  const queryClient = useQueryClient();
  const [model, setModel] = useState<JsonSchema>(jsonSchema);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const updatedModel = useRef<JsonSchema>(jsonSchema);

  const saveFunction = useCallback(
    () => mutate({ modelPath, model: updatedModel.current }),
    [modelPath, mutate],
  );

  const saveSchema = useCallback(
    (newModel: JsonSchema) => {
      setModel(newModel);
      updatedModel.current = newModel;
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveFunction();
      }, AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS);
    },
    [saveFunction],
  );

  const doesModelExist = useCallback(() => {
    const jsonModels: DataModelMetadataJson[] = queryClient.getQueryData([
      QueryKey.DataModelsJson,
      org,
      app,
    ]);
    const xsdModels: DataModelMetadataXsd[] = queryClient.getQueryData([
      QueryKey.DataModelsXsd,
      org,
      app,
    ]);
    const metadataList = mergeJsonAndXsdData(jsonModels, xsdModels);
    return metadataList.some((dataModel) => dataModel.repositoryRelativeUrl === modelPath);
  }, [queryClient, org, app, modelPath]);

  useOnUnmount(() => {
    clearTimeout(saveTimeoutRef.current);
    if (doesModelExist()) saveFunction();
  });

  return (
    <SchemaEditorApp
      jsonSchema={model}
      save={saveSchema}
      name={extractModelNameFromPath(modelPath)}
    />
  );
};

const extractModelNameFromPath = (path: string): string => {
  const filename = extractFilename(path);
  return removeSchemaExtension(filename);
};
