import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { Loader } from 'src/features/loading/Loader';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { createStrictContext } from 'src/utils/createContext';
import type { ILayoutSettings } from 'src/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const { Provider, useCtx } = createStrictContext<ILayoutSettings | undefined>({ name: 'LayoutSettingsContext' });

function useLayoutSettingsQuery() {
  const { fetchLayoutSettings } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();
  const dispatch = useAppDispatch();

  return useQuery({
    queryKey: ['layoutSettings', layoutSetId],
    queryFn: () => fetchLayoutSettings(layoutSetId),
    onSuccess: (settings) => {
      dispatch(FormLayoutActions.fetchSettingsFulfilled({ settings }));
    },
    onError: (error: HttpClientError) => {
      dispatch(FormLayoutActions.fetchSettingsRejected({ error }));
      window.logError('Fetching layout settings failed:\n', error);
    },
  });
}

export function LayoutSettingsProvider({ children }: React.PropsWithChildren) {
  const query = useLayoutSettingsQuery();
  const data = query.data;

  if (query.error) {
    return <UnknownError />;
  }

  if (query.isLoading) {
    return <Loader reason='layout-settings' />;
  }

  return <Provider value={data}>{children}</Provider>;
}

export const useLayoutSettings = () => useCtx();
