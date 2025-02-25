import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { PageModel } from 'app-shared/types/api/dto/PageModel';

export const useModifyPageMutation = (
  org: string,
  app: string,
  layoutSetName: string,
  pageName: string,
) => {
  const { modifyPage } = useServicesContext();

  return useMutation({
    mutationFn: (payload: PageModel) => modifyPage(org, app, layoutSetName, pageName, payload),
  });
};
