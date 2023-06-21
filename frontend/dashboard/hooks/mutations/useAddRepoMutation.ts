import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation } from '@tanstack/react-query';
import { AddRepoParams } from 'app-shared/types/api';

export const useAddRepoMutation = () => {
  const { addRepo } = useServicesContext();
  return useMutation((repoToAdd: AddRepoParams) => addRepo(repoToAdd));
};
