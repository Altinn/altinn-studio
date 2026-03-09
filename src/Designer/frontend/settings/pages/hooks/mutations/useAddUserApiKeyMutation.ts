import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { CreateApiKeyRequest } from 'app-shared/types/api/CreateApiKeyRequest';
import type { CreateApiKeyResponse } from 'app-shared/types/api/CreateApiKeyResponse';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export const useAddUserApiKeyMutation = () => {
  const { addUserApiKey } = useServicesContext();
  const queryClient = useQueryClient();
  return useMutation<CreateApiKeyResponse, AxiosError, CreateApiKeyRequest>({
    mutationFn: (payload) => addUserApiKey(payload),
    meta: {
      hideDefaultError: (error: AxiosError) => error?.response?.status === ServerCodes.Conflict,
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QueryKey.UserApiKeys] }),
  });
};
