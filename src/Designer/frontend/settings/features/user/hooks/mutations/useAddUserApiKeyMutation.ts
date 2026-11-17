import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { HttpError } from 'app-shared/utils/networking';
import type { AddUserApiKeyRequest } from 'app-shared/types/api/AddUserApiKeyRequest';
import type { AddUserApiKeyResponse } from 'app-shared/types/api/AddUserApiKeyResponse';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import type { ApiError } from 'app-shared/types/api/ApiError';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAddUserApiKeyMutation = () => {
  const { addUserApiKey } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<AddUserApiKeyResponse, HttpError<ApiError>, AddUserApiKeyRequest>({
    mutationFn: (payload) => addUserApiKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.UserApiKeys] });
    },
    meta: {
      hideDefaultError: (error: HttpError<ApiError>) =>
        error?.response?.status === ServerCodes.Conflict &&
        error?.response?.data?.errorCode === ApiErrorCodes.DuplicateTokenName,
    },
  });
};
