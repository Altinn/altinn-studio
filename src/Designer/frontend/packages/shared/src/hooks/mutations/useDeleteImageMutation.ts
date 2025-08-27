import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteImageMutation = (org: string, app: string) => {
  const queryClient = useQueryClient();
  const { deleteImage } = useServicesContext();
  return useMutation({
    mutationFn: (imageName: string) => deleteImage(org, app, imageName).then(() => imageName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.ImageFileNames, org, app] });
    },
  });
};
