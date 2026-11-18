import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ComponentIdsChange } from 'app-shared/types/api/FormLayout';
import type { LayoutComponent, PageLayout, PageLayouts } from '../types';

export type SavePageLayoutArgs = {
  pageName: string;
  layout: PageLayout;
  /** Tells the backend which component IDs changed, so it can update references to them. */
  componentIdsChange?: ComponentIdsChange;
};

export const useSavePageLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { saveFormLayout } = useServicesContext();
  const queryClient = useQueryClient();
  const queryKey = [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName];

  return useMutation({
    mutationFn: ({ pageName, layout, componentIdsChange }: SavePageLayoutArgs) =>
      saveFormLayout<LayoutComponent>(org, app, pageName, layoutSetName, {
        layout,
        componentIdsChange,
      }),
    onMutate: ({ pageName, layout }: SavePageLayoutArgs): void => {
      queryClient.setQueryData<PageLayouts>(queryKey, (layouts) => ({
        ...layouts,
        [pageName]: layout,
      }));
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
    // ux-editor caches the same files in its own format, so it must refetch them.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] }),
  });
};
