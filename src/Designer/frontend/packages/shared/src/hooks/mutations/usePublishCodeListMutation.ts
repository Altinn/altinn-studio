import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DefaultError, UseMutationResult } from '@tanstack/react-query';
import type { PublishCodeListPayload } from '../../types/api/PublishCodeListPayload';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { PUBLISHED_CODE_LIST_FOLDER } from 'app-shared/constants';

type UsePublishCodeListMutationOptions = {
  onStart?: (codeListName: string) => void;
  onFinish?: (codeListName: string) => void;
};

export function usePublishCodeListMutation(
  orgName: string,
  { onStart, onFinish }: UsePublishCodeListMutationOptions = {},
): UseMutationResult<void, DefaultError, PublishCodeListPayload> {
  const { publishCodeList } = useServicesContext();
  const client = useQueryClient();
  return useMutation<void, DefaultError, PublishCodeListPayload>({
    mutationFn: (payload) => publishCodeList(orgName, payload),
    onMutate: ({ title }) => onStart?.(title),
    onSettled: async (_data, _error, { title }) => {
      await client.refetchQueries({
        queryKey: [QueryKey.PublishedResources, orgName, PUBLISHED_CODE_LIST_FOLDER],
      });
      onFinish?.(title);
    },
  });
}
