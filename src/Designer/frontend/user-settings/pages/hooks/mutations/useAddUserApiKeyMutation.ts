import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { AddUserApiKeyRequest } from 'app-shared/types/api/AddUserApiKeyRequest';
import type { AddUserApiKeyResponse } from 'app-shared/types/api/AddUserApiKeyResponse';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import type { ApiError } from 'app-shared/types/api/ApiError';

export const useAddUserApiKeyMutation = () => {
  const { addUserApiKey } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<AddUserApiKeyResponse, AxiosError<ApiError>, AddUserApiKeyRequest>({
    mutationFn: (payload) => addUserApiKey(payload),
    meta: {
      hideDefaultError: (error: AxiosError<ApiError>) =>
        error?.response?.status === ServerCodes.Conflict &&
        error?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName,
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [QueryKey.UserApiKeys] }),
  });
};
