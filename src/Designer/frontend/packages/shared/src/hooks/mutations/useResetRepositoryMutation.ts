import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useResetRepositoryMutation = (owner: string, app: string) => {
  const { resetRepoChanges } = useServicesContext();
  return useMutation({
    mutationFn: () => resetRepoChanges(owner, app),
  });
};
