import { useUpsertTextResourceMutation as useUpsertSingleTextResourceMutation } from 'app-shared/hooks/mutations';
import { useMutation } from '@tanstack/react-query';
import type { UpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { useAppContext } from '..';

export const useUpsertTextResourceMutation = (owner: string, app: string) => {
  const { mutateAsync: upsertTextResource } = useUpsertSingleTextResourceMutation(owner, app);
  const { updateTextsForPreview } = useAppContext();
  return useMutation({
    mutationFn: ({ textId, language, translation }: UpsertTextResourceMutation) =>
      upsertTextResource({ textId, language, translation }),
    onSuccess: async ({ language }) => {
      await updateTextsForPreview(language);
    },
  });
};
