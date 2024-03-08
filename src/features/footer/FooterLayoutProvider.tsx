import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { ContextNotProvided } from 'src/core/contexts/context';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import type { IFooterLayout } from 'src/features/footer/types';

const useFooterLayoutQuery = () => {
  const { fetchFooterLayout } = useAppQueries();
  const utils = useQuery({
    queryKey: ['fetchFooterLayout'],
    queryFn: fetchFooterLayout,
  });

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
