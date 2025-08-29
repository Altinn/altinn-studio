import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UpdateTextIdPayload } from 'app-shared/types/api/UpdateTextIdPayload';

export const useTextIdMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { updateTextId } = useServicesContext();

  return useMutation({
    mutationFn: (payload: UpdateTextIdPayload) => updateTextId(owner, app, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, owner, app] });
    },
  });
};
