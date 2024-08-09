import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useDeleteImageMutation = (org: string, app: string) => {
  const { deleteImage } = useServicesContext();
  return useMutation({
    mutationFn: (imageName: string) => deleteImage(org, app, imageName),
  });
};
