import { queryOptions, skipToken } from '@tanstack/react-query';

import type { OptionsApi } from 'src/core/api-client/options.api';

export const optionsQueryKeys = {
  all: () => ['options'] as const,
  options: (url: string) => [...optionsQueryKeys.all(), 'options', url] as const,
  dataList: (url: string) => [...optionsQueryKeys.all(), 'dataList', url] as const,
};

export function optionsQuery({ url, optionsApi }: { url: string | undefined; optionsApi: OptionsApi }) {
  return queryOptions({
    queryKey: optionsQueryKeys.options(url ?? ''),
    queryFn: url ? () => optionsApi.getOptions(url) : skipToken,
  });
}

export function dataListQuery({ url, optionsApi }: { url: string | undefined; optionsApi: OptionsApi }) {
  return queryOptions({
    queryKey: optionsQueryKeys.dataList(url ?? ''),
    queryFn: url ? () => optionsApi.getDataList(url) : skipToken,
  });
}
