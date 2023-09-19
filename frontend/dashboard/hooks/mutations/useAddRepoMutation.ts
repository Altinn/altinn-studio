import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { MutationMeta, useMutation } from '@tanstack/react-query';
import { AddRepoParams } from 'app-shared/types/api';

export const useAddRepoMutation = (meta?: MutationMeta) => {
  const { addRepo } = useServicesContext();
  return useMutation({
    mutationFn: (repoToAdd: AddRepoParams) => addRepo(repoToAdd),
    meta,
  });
};
