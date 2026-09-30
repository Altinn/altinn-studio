import { skipToken, useQuery } from '@tanstack/react-query';
import type { IQueryParameters } from '@app/layout-contract/generated/common.generated';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';

export const useGetOptionsQuery = (
  url: string,
): UseQueryResult<{ data: IOptionInternal[]; headers: AxiosResponse['headers'] } | null> => {
  const { fetchOptions } = useAppQueries();
  return useQuery({
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
