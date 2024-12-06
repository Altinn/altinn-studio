import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { useMutation } from '@tanstack/react-query';

export interface UpsertTextResourceMutation {
  textId: string;
  language: string;
  translation: string;
}

export const useUpsertTextResourceMutation = (owner: string, app: string) => {
  const { mutateAsync: upsertTextResources } = useUpsertTextResourcesMutation(owner, app);
  return useMutation({
    mutationFn: ({ textId, language, translation }: UpsertTextResourceMutation) =>
      upsertTextResources({ language, textResources: [{ id: textId, value: translation }] }),
  });
};
