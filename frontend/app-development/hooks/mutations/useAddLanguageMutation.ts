import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { AddLanguagePayload } from 'app-shared/types/api/AddLanguagePayload';

export const useAddLanguageMutation = (owner, app) => {
  const q = useQueryClient();
  const { addLanguageCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: AddLanguagePayload) =>
      addLanguageCode(owner, app, payload.language, payload),
    onSuccess: async () => {
      q.invalidateQueries({ queryKey: [QueryKey.TextLanguages, owner, app] });
      q.invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] });
    },
  });
};
