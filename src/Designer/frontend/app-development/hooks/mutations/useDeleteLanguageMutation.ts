import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteLanguageMutation = (owner, app) => {
  const q = useQueryClient();
  const { deleteLanguageCode } = useServicesContext();
  return useMutation({
    mutationFn: (payload: { langCode: string }) => deleteLanguageCode(owner, app, payload.langCode),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.TextLanguages, owner, app] }),
  });
};
