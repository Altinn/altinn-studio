import { useMemo } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosError, AxiosResponse } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { useResolvedQueryParameters } from 'src/features/options/evalQueryParameters';
import { GeneratorData } from 'src/utils/layout/generator/GeneratorDataSources';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { LayoutReference } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IMapping, IQueryParameters } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export const useGetOptionsQuery = (
  url: string | undefined,
): UseQueryResult<AxiosResponse<IOptionInternal[], AxiosError>> => {
  const { fetchOptions } = useAppQueries();
  return useQuery({
    queryKey: ['fetchOptions', url],
    queryFn: url
      ? async () => {
          const result = await fetchOptions(url);
          const converted = castOptionsToStrings(result?.data);
          return { ...result, data: converted };
        }
      : skipToken,
    enabled: !!url,
  });
};

export const useGetOptionsUrl = (
  node: LayoutNode,
  optionsId: string | undefined,
  mapping?: IMapping,
  queryParameters?: IQueryParameters,
  secure?: boolean,
): string | undefined => {
  const mappingResult = FD.useMapping(mapping, GeneratorData.useDefaultDataType());
  const language = useCurrentLanguage();
  const instanceId = useLaxInstanceId();
  const reference: LayoutReference = useMemo(() => ({ type: 'node', id: node.id }), [node]);
  const resolvedQueryParameters = useResolvedQueryParameters(queryParameters, reference);

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
