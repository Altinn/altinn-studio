import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useDeletePageMutation = (org: string, app: string, layoutSetName: string) => {
  const { deletePage } = useServicesContext();

  return useMutation({
    mutationFn: (pageName: string) => deletePage(org, app, layoutSetName, pageName),
  });
};
