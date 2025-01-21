import { useAppMetadataMutation } from '../../../../../../hooks/mutations';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { APP_NAME } from 'app-shared/constants';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

export const useUpdateAppTitle = (
  oldAppMetadata: ApplicationMetadata,
): ((language: string, appTitle: string) => void) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  return (language: string, appTitle: string) => {
    const updatedAppMetadata = {
      ...oldAppMetadata,
      title: { ...oldAppMetadata.title, [language]: appTitle },
    };

    updateAppMetadataMutation(updatedAppMetadata);
    upsertTextResource({
      language,
      translation: appTitle,
      textId: APP_NAME,
    });
  };
};
