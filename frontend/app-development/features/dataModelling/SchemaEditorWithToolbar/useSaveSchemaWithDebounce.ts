import { useCallback, useEffect, useRef, useState } from 'react';
import { useSchemaMutation } from '../../../hooks/mutations';
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

export const useSaveSchemaWithDebounce = (jsonSchema: JsonSchema, modelPath: string) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate } = useSchemaMutation();
  const queryClient = useQueryClient();
  const [model, setModel] = useState<JsonSchema>(jsonSchema);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
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

  return { saveSchema, model };
};
