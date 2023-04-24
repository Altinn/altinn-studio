import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { QueryKey } from '../../types/QueryKey';

export const useTextIdMutation = (owner, app) => {
  const q = useQueryClient();
  const { updateTextId } = useServicesContext();
  return useMutation({
    mutationFn: (payload: TextResourceIdMutation[]) => updateTextId(owner, app, payload),
    onSuccess: () => q.invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] }),
  });
};
