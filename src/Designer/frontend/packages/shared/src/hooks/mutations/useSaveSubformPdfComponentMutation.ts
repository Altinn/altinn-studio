import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import type { SubformPdfComponentPayload } from 'app-shared/types/api/SubformPdfComponentPayload';

export type SaveSubformPdfComponentMutationArgs = SubformPdfComponentPayload & {
  layoutSetId: string;
};

/**
 * Saves a hidden component copy in the subform PDF task pages. Creates missing pages and returns the
 * updated component list.
 */
export const useSaveSubformPdfComponentMutation = (org: string, app: string) => {
  const { saveSubformPdfComponent } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation<SubformComponent[], Error, SaveSubformPdfComponentMutationArgs>({
    mutationFn: ({ layoutSetId, ...payload }: SaveSubformPdfComponentMutationArgs) =>
      saveSubformPdfComponent(org, app, layoutSetId, payload),
    onSuccess: (subformComponents: SubformComponent[], { layoutSetId }) => {
      queryClient.setQueryData([QueryKey.SubformComponents, org, app], subformComponents);
      void queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
      void queryClient.invalidateQueries({
        queryKey: [QueryKey.FormLayouts, org, app, layoutSetId],
      });
    },
    // The pages may have been created before a later step failed.
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: [QueryKey.SubformComponents, org, app] });
      void queryClient.invalidateQueries({ queryKey: [QueryKey.LayoutSets, org, app] });
    },
  });
};
