import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import type { IFooterLayout } from 'src/features/footer/types';

// Also used for prefetching @see appPrefetcher.ts
export function useFooterLayoutQueryDef() {
  const { fetchFooterLayout } = useAppQueries();
  return {
    queryKey: ['fetchFooterLayout'],
    queryFn: fetchFooterLayout,
  };
}

const useFooterLayoutQuery = () => {
  const utils = useQuery(useFooterLayoutQueryDef());

  useEffect(() => {
    utils.error && window.logError('Fetching footer failed:\n', utils.error);
  }, [utils.error]);

  return utils;
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
