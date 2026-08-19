import { useCallback, useEffect, useRef, useState } from 'react';
import { useSchemaQuery, usePrefillQuery } from '../../../hooks/queries';
import { useSchemaMutation, usePrefillMutation } from '../../../hooks/mutations';
import {
  StudioCenter,
  StudioError,
  StudioPageSpinner,
  StudioParagraph,
  StudioValidationMessage,
} from '@studio/components';
import { SchemaEditorApp } from '@altinn/schema-editor/SchemaEditorApp';
import { useTranslation } from 'react-i18next';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { PrefillConfig } from 'app-shared/types/PrefillConfig';
import { useOnUnmount } from '../hooks/useOnUnmount';
import type {
  DataModelMetadataJson,
  DataModelMetadataXsd,
} from 'app-shared/types/DataModelMetadata';
import { useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { mergeJsonAndXsdData } from 'app-development/utils/metadataUtils';
import { FileNameUtils } from '@studio/pure-functions';
export interface SelectedSchemaEditorProps {
  modelPath: string;
}

export const SelectedSchemaEditor = ({ modelPath }: SelectedSchemaEditorProps) => {
  const { data, status, error } = useSchemaQuery(modelPath);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioPageSpinner spinnerTitle={t('schema_editor.loading_page')} />;

    case 'error':
      return (
        <StudioCenter>
          <StudioError>
            <StudioParagraph>{t('general.fetch_error_message')}</StudioParagraph>
            <StudioParagraph>{t('general.error_message_with_colon')}</StudioParagraph>
            <StudioValidationMessage>
              {error.response?.data?.customErrorMessages[0] ?? error.message}
            </StudioValidationMessage>
          </StudioError>
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
  const { data: prefillConfig } = usePrefillQuery(modelPath);
  const { mutate: mutatePrefill } = usePrefillMutation();
  const queryClient = useQueryClient();
  const [model, setModel] = useState<JsonSchema>(jsonSchema);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const updatedModel = useRef<JsonSchema>(jsonSchema);

  useEffect(() => {
    setModel(jsonSchema);
  }, [jsonSchema]);

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

  const savePrefillConfig = useCallback(
    (updatedPrefillConfig: PrefillConfig) =>
      mutatePrefill({ modelPath, prefillConfig: updatedPrefillConfig }),
    [modelPath, mutatePrefill],
  );

  return (
    <SchemaEditorApp
      jsonSchema={model}
      save={saveSchema}
      name={extractModelNameFromPath(modelPath)}
      prefillConfig={prefillConfig}
      savePrefillConfig={savePrefillConfig}
    />
  );
};

const extractModelNameFromPath = (path: string): string => {
  const filename = FileNameUtils.extractFileName(path);
  return FileNameUtils.removeSchemaExtension(filename);
};
