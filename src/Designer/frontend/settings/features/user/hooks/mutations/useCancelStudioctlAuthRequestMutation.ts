import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation } from '@tanstack/react-query';

export const useCancelStudioctlAuthRequestMutation = () => {
  const { cancelStudioctlAuthRequest } = useServicesContext();

  return useMutation({
    mutationFn: (id: string) => cancelStudioctlAuthRequest(id),
  });
};
