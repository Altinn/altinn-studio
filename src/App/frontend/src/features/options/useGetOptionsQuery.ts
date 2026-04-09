import { skipToken, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { FormStore } from 'src/features/form/FormContext';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IMapping, IQueryParameters } from 'src/layout/common.generated';

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
  mapping?: IMapping,
  queryParameters?: IQueryParameters,
  secure?: boolean,
): string | undefined => {
  const mappingResult = FormStore.data.useMapping(mapping, FormBootstrap.useDefaultDataType());
  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const resolvedQueryParameters = useResolvedQueryParameters(queryParameters);

  return optionsId
    ? getOptionsUrl({
        optionsId,
        language,
        queryParameters: {
          ...mappingResult,
          ...resolvedQueryParameters,
        },
        secure,
        instanceId,
      })
    : undefined;
};
