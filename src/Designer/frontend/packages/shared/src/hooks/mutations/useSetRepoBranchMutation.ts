import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useSetRepoBranchMutation = (owner: string, app: string) => {
  const { setRepoBranch } = useServicesContext();
  return useMutation({
    mutationFn: (branch: string) => setRepoBranch(owner, app, branch),
  });
};
