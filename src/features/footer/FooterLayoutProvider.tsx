import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { FooterLayoutActions } from 'src/features/footer/data/footerLayoutSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { IFooterLayout } from 'src/features/footer/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

const useFooterLayoutQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchFooterLayout } = useAppQueries();
  return useQuery({
    queryKey: ['fetchFooterLayout'],
    queryFn: fetchFooterLayout,
    onSuccess: (footerLayout) => {
      if (footerLayout) {
        dispatch(FooterLayoutActions.fetchFulfilled({ footerLayout }));
      }
    },
    onError: (error: HttpClientError) => {
      window.logError('Fetching footer failed:\n', error);
    },
  });
};

const { Provider, useLaxCtx } = delayedContext(() =>
  createQueryContext({
    name: 'FooterLayout',
    required: true,
    query: useFooterLayoutQuery,
  }),
);

const noFooter: IFooterLayout['footer'] = [];
export const FooterLayoutProvider = Provider;
export const useFooterLayout = () => {
  const ctx = useLaxCtx();
  if (ctx == ContextNotProvided) {
    return noFooter;
  }

  return ctx?.footer || noFooter;
};
