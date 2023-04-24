import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { LangCode, TextResourceEntry } from '@altinn/text-editor';
import { QueryKey } from '../../types/QueryKey';

export const useAddLanguageMutation = (owner, app) => {
  const q = useQueryClient();
  const { addLanguageCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: { language: LangCode; resources: TextResourceEntry[] }) =>
      addLanguageCode(owner, app, payload.language, payload),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.TextLanguages, owner, app] }),
  });
};
