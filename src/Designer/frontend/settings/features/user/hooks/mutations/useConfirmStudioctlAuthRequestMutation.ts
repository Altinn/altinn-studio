import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation } from '@tanstack/react-query';

export const useConfirmStudioctlAuthRequestMutation = () => {
  const { confirmStudioctlAuthRequest } = useServicesContext();

  return useMutation({
    mutationFn: (id: string) => confirmStudioctlAuthRequest(id),
  });
};
