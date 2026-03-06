import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { CreatePersonalAccessTokenRequest } from 'app-shared/types/api/CreatePersonalAccessTokenRequest';
import type { CreatePersonalAccessTokenResponse } from 'app-shared/types/api/CreatePersonalAccessTokenResponse';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export const useAddUserPersonalAccessTokenMutation = () => {
  const { addUserPersonalAccessToken } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<
    CreatePersonalAccessTokenResponse,
    AxiosError,
    CreatePersonalAccessTokenRequest
  >({
    mutationFn: (payload) => addUserPersonalAccessToken(payload),
    meta: {
      hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [QueryKey.UserPersonalAccessTokens] }),
  });
};
