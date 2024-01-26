import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AxiosResponse } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { FD } from 'src/features/formData/FormDataWrite';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { castOptionsToStrings } from 'src/features/options/castOptionsToStrings';
import { getOptionsUrl } from 'src/utils/urls/appUrlHelper';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IMapping } from 'src/layout/common.generated';

export const useGetOptionsQuery = (
  optionsId: string | undefined,
  mapping?: IMapping,
  queryParameters?: Record<string, string>,
  secure?: boolean,
): UseQueryResult<AxiosResponse<IOptionInternal[], any>> => {
  const { fetchOptions } = useAppQueries();
  const mappingResult = FD.useMapping(mapping);
  const language = useCurrentLanguage();
  const instanceId = useLaxInstance()?.instanceId;

  const url = getOptionsUrl({
    optionsId: optionsId || '',
    language,
    queryParameters: {
      ...mappingResult,
      ...queryParameters,
    },
    secure,
    instanceId,
  });

  return useQuery({
    queryKey: ['fetchOptions', url],
    queryFn: async () => {
      const result = await fetchOptions(url);
      return { ...result, data: castOptionsToStrings(result?.data) };
    },
    enabled: !!optionsId,
  });
};
