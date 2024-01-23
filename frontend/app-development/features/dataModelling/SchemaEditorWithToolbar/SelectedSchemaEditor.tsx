import React, { useCallback, useRef, useState } from 'react';
import { useSchemaQuery } from '../../../hooks/queries';
import { useSchemaMutation } from '../../../hooks/mutations';
import { StudioCenter, StudioPageSpinner } from '@studio/components';
import { Alert, ErrorMessage, Paragraph } from '@digdir/design-system-react';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import { JsonSchema } from 'app-shared/types/JsonSchema';
import { useOnUnmount } from 'app-shared/hooks/useOnUnmount';
import { DatamodelMetadataJson, DatamodelMetadataXsd } from 'app-shared/types/DatamodelMetadata';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { mergeJsonAndXsdData } from 'app-development/utils/metadataUtils';

export interface SelectedSchemaEditorProps {
  modelPath: string;
}

export const SelectedSchemaEditor = ({ modelPath }: SelectedSchemaEditorProps) => {
  const { data, status, error } = useSchemaQuery(modelPath);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioPageSpinner />;

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
  const { org, app } = useStudioUrlParams();
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

  useOnUnmount(() => {
    clearTimeout(saveTimeoutRef.current);
    const jsonModels: DatamodelMetadataJson[] = queryClient.getQueryData([
      QueryKey.DatamodelsJson,
      org,
      app,
    ]);
    const xsdModels: DatamodelMetadataXsd[] = queryClient.getQueryData([
      QueryKey.DatamodelsXsd,
      org,
      app,
    ]);
    const metadataList = mergeJsonAndXsdData(jsonModels, xsdModels);
    const datamodelExists = metadataList.some(
      (datamodel) => datamodel.repositoryRelativeUrl === modelPath,
    );
    if (datamodelExists) saveFunction();
  });

  return <SchemaEditorApp jsonSchema={model} save={saveSchema} />;
};
