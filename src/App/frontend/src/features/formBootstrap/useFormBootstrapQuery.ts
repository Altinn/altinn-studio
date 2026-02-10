import { skipToken, useQuery } from '@tanstack/react-query';

import { useIsStateless } from 'src/features/applicationMetadata';
import { useLayoutSetIdFromUrl } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getFormBootstrapUrl, getStatelessFormBootstrapUrl } from 'src/utils/urls/appUrlHelper';
import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';

export interface FormBootstrapQueryOptions {
  layoutSetIdOverride?: string;
  dataElementIdOverride?: string;
}

export function useFormBootstrapQuery(options?: FormBootstrapQueryOptions) {
  const isStateless = useIsStateless();
  const instanceId = useLaxInstanceId();
  const layoutSetIdFromUrl = useLayoutSetIdFromUrl();
  const language = useCurrentLanguage();
  const isPdf = useIsPdf();

  const effectiveLayoutSetId = options?.layoutSetIdOverride ?? layoutSetIdFromUrl;
  const enabled = isStateless ? !!effectiveLayoutSetId : !!instanceId;

  return useQuery({
    queryKey: [
      'formBootstrap',
      isStateless ? 'stateless' : 'instance',
      isStateless ? effectiveLayoutSetId : instanceId,
      layoutSetIdFromUrl,
      options?.layoutSetIdOverride,
      options?.dataElementIdOverride,
      isPdf,
      language,
    ],
    queryFn: enabled
      ? async () => {
          const url = isStateless
            ? getStatelessFormBootstrapUrl(effectiveLayoutSetId!, { language })
            : getFormBootstrapUrl(instanceId!, {
                layoutSetId: options?.layoutSetIdOverride,
                dataElementId: options?.dataElementIdOverride,
                pdf: isPdf,
                language,
              });

          return await httpGet<FormBootstrapResponse>(url);
        }
      : skipToken,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}
