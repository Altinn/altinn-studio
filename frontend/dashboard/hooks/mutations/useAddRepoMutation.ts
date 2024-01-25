import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { MutationMeta } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { AddRepoParams } from 'app-shared/types/api';

export const useAddRepoMutation = (meta?: MutationMeta) => {
  const { addRepo } = useServicesContext();
  return useMutation({
    mutationFn: (repoToAdd: AddRepoParams) => addRepo(repoToAdd),
    meta,
  });
};
