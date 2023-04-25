import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { TextResourceIdMutation } from '@altinn/text-editor/src/types';
import { QueryKey } from '../../types/QueryKey';
import { QueryKey as UxEditorQueryKey } from '../../../packages/ux-editor/src/types/QueryKey';

export const useTextIdMutation = (owner, app) => {
  const { invalidateQueries } = useQueryClient();
  const { updateTextId } = useServicesContext();
  return useMutation({
    mutationFn: (payload: TextResourceIdMutation[]) => updateTextId(owner, app, payload),
    onSuccess: async () => {
      await invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] });
      await invalidateQueries({ queryKey: [UxEditorQueryKey.FormLayouts, owner, app] });
    },
  });
};
