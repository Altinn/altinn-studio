import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
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

const saveMutationKey = 'AppBuilderSavePageLayout';

// The apps whose pages must be loaded again once no page is being saved, keyed by `org/app`.
const appsToRefresh = new WeakMap<QueryClient, Set<string>>();

/**
 * Saves a page. The page is changed in the cache at once, so the canvas shows the change while it is saved.
 *
 * When component IDs change or components are deleted, the backend also updates the references to them in other
 * pages and in the layout settings, also in other layout sets. The builder then loads the pages and the settings
 * again, or a later save of another page would bring back what the backend removed. It waits until no page is being
 * saved, so the pages it loads include every save, and a page loaded before a save does not replace the change.
 */
export const useSavePageLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { saveFormLayout } = useServicesContext();
  const queryClient = useQueryClient();
  const queryKey = [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName];
  const mutationKey = [saveMutationKey, org, app];

  return useMutation({
    mutationKey,
    mutationFn: ({ pageName, layout, componentIdsChange }: SavePageLayoutArgs) =>
      saveFormLayout<LayoutComponent>(org, app, pageName, layoutSetName, {
        layout,
        componentIdsChange,
      }),
    onMutate: async ({ pageName, layout }: SavePageLayoutArgs): Promise<void> => {
      // A load that is under way could otherwise replace the change with the page as it was.
      await queryClient.cancelQueries({ queryKey: [QueryKey.AppBuilderFormLayouts, org, app] });
      queryClient.setQueryData<PageLayouts>(queryKey, (layouts) => ({
        ...layouts,
        [pageName]: layout,
      }));
    },
    onError: () => queryClient.invalidateQueries({ queryKey }),
    // ux-editor caches the same files in its own format, so it must refetch them.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app, layoutSetName] }),
    onSettled: (_data, error, { componentIdsChange }) => {
      const apps = appsToRefresh.get(queryClient) ?? new Set<string>();
      appsToRefresh.set(queryClient, apps);
      const appId = `${org}/${app}`;
      if (!error && componentIdsChange?.length) apps.add(appId);

      // This save still counts as under way here, so 1 means no other save of the app is.
      const isLastSave = queryClient.isMutating({ mutationKey }) <= 1;
      if (!isLastSave || !apps.has(appId)) return;
      apps.delete(appId);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: [QueryKey.AppBuilderFormLayouts, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, org, app] }),
        queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayoutSettings, org, app] }),
      ]);
    },
  });
};
