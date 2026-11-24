import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/** Deletes texts in every language. */
export const useDeleteTextsMutation = (org: string, app: string) => {
  const { updateTextId } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    // A text ID without a new ID is deleted.
    mutationFn: (textKeys: string[]) =>
      updateTextId(
        org,
        app,
        textKeys.map((oldId) => ({ oldId })),
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.TextResources, org, app] }),
  });
};
