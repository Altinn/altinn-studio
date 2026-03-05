import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PersonalAccessTokenResponse } from 'app-shared/types/api/PersonalAccessTokenResponse';

export const useDeleteUserPersonalAccessTokenMutation = () => {
  const { deleteUserPersonalAccessToken } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteUserPersonalAccessToken(id),
    onSuccess: (_, id) =>
      queryClient.setQueryData<PersonalAccessTokenResponse[]>(
        [QueryKey.UserPersonalAccessTokens],
        (prev) => prev?.filter((token) => token.id !== id),
      ),
  });
};
