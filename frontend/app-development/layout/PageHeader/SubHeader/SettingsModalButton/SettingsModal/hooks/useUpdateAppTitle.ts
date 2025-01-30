import { useAppMetadataMutation } from '../../../../../../hooks/mutations';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { APP_NAME } from 'app-shared/constants';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';

type UpdateAppTitleProps = {
  appTitle: string;
  language: string;
};

export const useUpdateAppTitle = (
  oldAppMetadata: ApplicationMetadata,
): ((args: UpdateAppTitleProps) => void) => {
  const { org, app } = useStudioEnvironmentParams();
  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  return ({ appTitle, language }: UpdateAppTitleProps) => {
    const updatedAppMetadata = getAppMetadataWithNewAppTitle(oldAppMetadata, language, appTitle);
    updateAppMetadataMutation(updatedAppMetadata);
    const upsertTextResourceArgs: UpsertTextResourceMutation = getUpsertTextResourceArgs(
      language,
      appTitle,
    );
    upsertTextResource(upsertTextResourceArgs);
  };
};

const getAppMetadataWithNewAppTitle = (
  appMetadata: ApplicationMetadata,
  language: string,
  appTitle: string,
): ApplicationMetadata => {
  return {
    ...appMetadata,
    title: { ...appMetadata.title, [language]: appTitle },
  };
};

const getUpsertTextResourceArgs = (
  language: string,
  appTitle: string,
): UpsertTextResourceMutation => {
  return {
    language,
    translation: appTitle,
    textId: APP_NAME,
  };
};
