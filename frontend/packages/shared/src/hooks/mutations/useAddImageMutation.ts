import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useAddImageMutation = (org: string, app: string) => {
  const { addImage } = useServicesContext();
  return useMutation({
    mutationFn: (image: FormData) => addImage(org, app, image),
  });
};
