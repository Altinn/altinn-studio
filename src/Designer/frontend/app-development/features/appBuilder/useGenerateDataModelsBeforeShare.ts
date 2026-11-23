import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useAppBuilderAvailability } from './useAppBuilderAvailability';

/**
 * The app builder saves only the JSON schema of a data model, since generating the C# model compiles it
 * on the server. The app needs the C# model only when it runs, so the out-of-date models are generated
 * when the user shares the changes. Undefined for apps the builder is not available for, whose users
 * generate the models themselves in the data model editor.
 */
export function useGenerateDataModelsBeforeShare(
  org: string,
  app: string,
): (() => Promise<void>) | undefined {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { getDataModelsJson, getDataModelGenerationStatus, getDataModel, generateModels } =
    useServicesContext();
  const { isAvailable } = useAppBuilderAvailability(org, app);

  if (!isAvailable) return undefined;

  return async (): Promise<void> => {
    const dataModels = (await getDataModelsJson(org, app)) ?? [];
    const failedModels: string[] = [];
    let hasGenerated = false;

    // One at a time, since each generation compiles code on the server.
    for (const { fileName, repositoryRelativeUrl: modelPath } of dataModels) {
      try {
        const isOutOfDate = await getDataModelGenerationStatus(org, app, modelPath);
        if (!isOutOfDate) continue;
        const schema = await getDataModel(org, app, modelPath);
        await generateModels(org, app, modelPath, schema);
        hasGenerated = true;
      } catch {
        failedModels.push(fileName.replace('.schema.json', ''));
      }
    }

    if (hasGenerated) await invalidateGeneratedFiles(queryClient, org, app);
    if (failedModels.length > 0) {
      toast.error(
        t('app_builder.share.generation_failed', { dataModels: failedModels.join(', ') }),
      );
    }
  };
}

const invalidateGeneratedFiles = (
  queryClient: ReturnType<typeof useQueryClient>,
  org: string,
  app: string,
): Promise<unknown> =>
  Promise.all(
    [
      QueryKey.DataModelsJson,
      QueryKey.DataModelsXsd,
      QueryKey.AppMetadata,
      QueryKey.AppMetadataModelIds,
      QueryKey.DataModelGenerationStatus,
    ].map((key) => queryClient.invalidateQueries({ queryKey: [key, org, app] })),
  );
