import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useMutation } from '@tanstack/react-query';
import type { UpsertTextResourceMutation } from '@altinn/text-editor/src/types';
import { useAppContext } from '..';

export const useUpsertTextResourceMutation = (owner: string, app: string) => {
  const { mutateAsync: upsertTextResources } = useUpsertTextResourcesMutation(owner, app);
  const { refetchTexts } = useAppContext();
  return useMutation({
    mutationFn: ({ textId, language, translation }: UpsertTextResourceMutation) =>
      upsertTextResources({ language, textResources: [{ id: textId, value: translation }] }),
    onSuccess: async ({ language }) => {
      await refetchTexts(language);
    },
  });
};
