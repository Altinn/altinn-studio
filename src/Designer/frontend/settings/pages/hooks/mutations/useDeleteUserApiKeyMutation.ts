import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApiKeyResponse } from 'app-shared/types/api/ApiKeyResponse';

export const useDeleteUserApiKeyMutation = () => {
  const { deleteUserApiKey } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUserApiKey(id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<ApiKeyResponse[]>([QueryKey.UserApiKeys], (prev) =>
        prev?.filter((token) => token.id !== id),
      ),
  });
};
