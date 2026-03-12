import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UserApiKeyResponse } from 'app-shared/types/api/UserApiKeyResponse';

export const useDeleteUserApiKeyMutation = () => {
  const { deleteUserApiKey } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUserApiKey(id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<UserApiKeyResponse[]>([QueryKey.UserApiKeys], (prev) =>
        prev?.filter((userApiKey) => userApiKey.id !== id),
      ),
  });
};
