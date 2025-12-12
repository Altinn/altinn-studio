import { skipToken, useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { castOptionsToStrings, type IOptionInternal } from 'src/features/options/castOptionsToStrings';

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

function useCodeListQueries(urls: string[]) {
  const { fetchOptions } = useAppQueries();

  return useQueries({
    queries: urls.map((url) => ({
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
    })),
  });
}
