import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';

export const useAddPageMutation = (org: string, app: string, layoutSetName: string) => {
  const { createPage } = useServicesContext();

  return useMutation({
    mutationFn: (page: PageModel) => createPage(org, app, layoutSetName, page),
  });
};
