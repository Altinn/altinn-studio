import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

/**
 * The backend keeps the page order in the layout settings and the navigation buttons on the pages in
 * step when a page is added or deleted, so the builder uses its page endpoints for those.
 */
export const useCreatePageMutation = (org: string, app: string, layoutSetName: string) => {
  const { createPage } = useServicesContext();
  const invalidatePages = useInvalidatePages(org, app, layoutSetName);
  return useMutation({
    mutationFn: (pageName: string) => createPage(org, app, layoutSetName, { id: pageName }),
    onSettled: invalidatePages,
  });
};

export const useDeletePageMutation = (org: string, app: string, layoutSetName: string) => {
  const { deletePage } = useServicesContext();
  const invalidatePages = useInvalidatePages(org, app, layoutSetName);
  return useMutation({
    mutationFn: (pageName: string) => deletePage(org, app, layoutSetName, pageName),
    onSettled: invalidatePages,
  });
};

export const useChangePageOrderMutation = (org: string, app: string, layoutSetName: string) => {
  const { changePageOrder } = useServicesContext();
  const queryClient = useQueryClient();
  const invalidatePages = useInvalidatePages(org, app, layoutSetName);
  const settingsKey = [QueryKey.FormLayoutSettings, org, app, layoutSetName];
  return useMutation({
    mutationFn: (pageNames: string[]) =>
      changePageOrder(org, app, layoutSetName, { pages: pageNames.map((id) => ({ id })) }),
    onMutate: (pageNames: string[]): void => {
      queryClient.setQueryData(settingsKey, (settings: Record<string, any> | undefined) => ({
        ...settings,
        pages: { ...settings?.pages, order: pageNames },
      }));
    },
    onSettled: invalidatePages,
  });
};

const useInvalidatePages = (org: string, app: string, layoutSetName: string) => {
  const queryClient = useQueryClient();
  return async (): Promise<void> => {
    await Promise.all(
      [
        QueryKey.AppBuilderFormLayouts,
        QueryKey.FormLayoutSettings,
        QueryKey.FormLayouts,
        QueryKey.Pages,
      ].map((key) => queryClient.invalidateQueries({ queryKey: [key, org, app, layoutSetName] })),
    );
  };
};
