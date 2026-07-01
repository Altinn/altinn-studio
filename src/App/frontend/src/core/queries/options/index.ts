import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useOptionsApi } from 'src/core/contexts/ApiProvider';
import { dataListQuery, optionsQuery } from 'src/core/queries/options/options.queries';
import type { OptionsApi } from 'src/core/api-client/options.api';

type OptionsQueryData = Awaited<ReturnType<OptionsApi['getOptions']>>;

export function useOptionsQuery<TData = OptionsQueryData>(
  url: string | undefined,
  select?: (data: OptionsQueryData) => TData,
): UseQueryResult<TData> {
  const optionsApi = useOptionsApi();
  return useQuery({ ...optionsQuery({ url, optionsApi }), select });
}

export function useDataListQuery(url: string | undefined) {
  const optionsApi = useOptionsApi();
  return useQuery(dataListQuery({ url, optionsApi }));
}
