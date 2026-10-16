import { skipToken, useQuery } from '@tanstack/react-query';
import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';

import { useAppQueries } from 'src/core/queries/QueryProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';

export const useGetOptionsQuery = (url: string) => {
  const { fetchOptions } = useAppQueries();
  const { data, error, isLoading, isFetching } = useQuery({
    queryKey: ['fetchOptions', url],
    queryFn: url
      ? async () => {
          const result = await fetchOptions(url);
          if (!result) {
            return null;
          }

          return {
            headers: result.headers,
            data: castOptionsToStrings(result.data),
          };
        }
      : skipToken,
    enabled: !!url,
  });
  return { data, error, isLoading, isFetching };
};

export const useGetOptionsUrl = (
  optionsId: string | undefined,
  queryParameters?: IQueryParameters,
  secure?: boolean,
): string | undefined => {
  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const resolvedQueryParameters = useResolvedQueryParameters(queryParameters);

  return optionsId
    ? getOptionsUrl({
        optionsId,
        language,
        queryParameters: resolvedQueryParameters,
        secure,
        instanceId,
      })
    : undefined;
};
