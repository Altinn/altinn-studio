import { useMutation } from '@tanstack/react-query';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import type { PublishCodeListPayload } from '../../types/api/PublishCodeListPayload';
import { useServicesContext } from '../../contexts/ServicesContext';

export function usePublishCodeListMutation(
  orgName: string,
): UseMutationResult<void, DefaultError, PublishCodeListPayload> {
  const { publishCodeList } = useServicesContext();
  return useMutation<void, DefaultError, PublishCodeListPayload>({
    mutationFn: (payload) => publishCodeList(orgName, payload),
  });
}
