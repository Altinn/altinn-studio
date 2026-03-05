import { skipToken, useQuery } from '@tanstack/react-query';

import { useIsStateless } from 'src/features/applicationMetadata';
import { useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useIsPdf } from 'src/hooks/useIsPdf';
import { httpGet } from 'src/utils/network/sharedNetworking';
import { getFormBootstrapUrl, getStatelessFormBootstrapUrl } from 'src/utils/urls/appUrlHelper';
import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';

export interface FormBootstrapQueryOptions {
  uiFolder: string;
  dataElementIdOverride?: string;
}

export function useFormBootstrapQuery(options: FormBootstrapQueryOptions) {
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
    ],
    queryFn: enabled
      ? async () => {
          const url = isStateless
            ? getStatelessFormBootstrapUrl(options.uiFolder, { language })
            : getFormBootstrapUrl(instanceId!, options.uiFolder, {
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
