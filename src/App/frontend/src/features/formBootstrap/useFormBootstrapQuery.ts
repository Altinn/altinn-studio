import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useIsStateless } from 'src/features/applicationMetadata';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPdf } from 'src/hooks/useIsPdf';

export interface FormBootstrapQueryOptions {
  uiFolder: string;
  dataElementIdOverride?: string;
  prefill?: string;
}

export function useFormBootstrapQuery(options: FormBootstrapQueryOptions) {
  const { fetchFormBootstrapForStateless, fetchFormBootstrapForInstance } = useAppQueries();
  const isStateless = useIsStateless();
  const instanceId = useLaxInstanceId();
  const language = useCurrentLanguage();
  const isPdf = useIsPdf();

  const enabled = isStateless || !!instanceId;

  return useQuery({
    queryKey: [
      'formBootstrap',
      options.uiFolder,
      isStateless ? 'stateless' : 'instance',
      instanceId,
      options?.dataElementIdOverride,
      isPdf,
      language,
      options.prefill,
    ],
    queryFn: enabled
      ? async () =>
          isStateless
            ? await fetchFormBootstrapForStateless({ uiFolder: options.uiFolder, language, prefill: options.prefill })
            : await fetchFormBootstrapForInstance({
                instanceId: instanceId!,
                uiFolder: options.uiFolder,
                dataElementId: options?.dataElementIdOverride,
                pdf: isPdf,
                language,
              })
      : skipToken,
    staleTime: 0,
    gcTime: 0,
  });
}
