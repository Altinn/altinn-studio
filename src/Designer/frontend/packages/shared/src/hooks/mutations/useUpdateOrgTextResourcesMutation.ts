import type {
  DefaultError,
  UseMutationResult,
  QueryKey as TanstackQueryKey,
} from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';
import { QueryKey } from '../../types/QueryKey';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { ITextResourcesWithLanguage } from 'app-shared/types/global';
import { TextResourceUtils } from 'libs/studio-pure-functions/src';

export type UpdateOrgTextResourcesMutationArgs = {
  language: string;
  payload: KeyValuePairs<string>;
};

type Context = {
  key: TanstackQueryKey;
};

export type UseUpdateOrgTextResourcesMutationResult = UseMutationResult<
  ITextResourcesWithLanguage,
  DefaultError,
  UpdateOrgTextResourcesMutationArgs,
  Context
>;

export const useUpdateOrgTextResourcesMutation = (
  org: string,
): UseUpdateOrgTextResourcesMutationResult => {
  const client = useQueryClient();
  const { updateOrgTextResources } = useServicesContext();
  return useMutation<
    ITextResourcesWithLanguage,
    DefaultError,
    UpdateOrgTextResourcesMutationArgs,
    Context
  >({
    mutationFn: ({ language, payload }: UpdateOrgTextResourcesMutationArgs) =>
      updateOrgTextResources(org, language, payload),
    onMutate: (args: UpdateOrgTextResourcesMutationArgs): Context => {
      const key = queryKey(org, args.language);
      client.setQueryData<ITextResourcesWithLanguage>(key, updater(args));
      return { key };
    },
    onError: (_err, _newData, { key }) => client.invalidateQueries({ queryKey: key, exact: true }),
    onSuccess: (data, _variables, { key }) =>
      client.setQueryData<ITextResourcesWithLanguage>(key, data),
  });
};

const queryKey = (org: string, language: string): TanstackQueryKey => [
  QueryKey.OrgTextResources,
  org,
  language,
];

type Updater = (oldData?: ITextResourcesWithLanguage) => ITextResourcesWithLanguage;

function updater({ language, payload }: UpdateOrgTextResourcesMutationArgs): Updater {
  return (oldData?: ITextResourcesWithLanguage): ITextResourcesWithLanguage => {
    const resources = oldData?.resources || [];
    const utils = TextResourceUtils.fromArray(resources);
    const updatedUtils = utils.setValues(payload);
    return updatedUtils.withLanguage(language);
  };
}
