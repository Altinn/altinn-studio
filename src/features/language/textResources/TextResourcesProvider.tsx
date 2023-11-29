import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { resourcesAsMap } from 'src/features/language/textResources/resourcesAsMap';
import { TextResourcesActions } from 'src/features/language/textResources/textResourcesSlice';
import { useProfile } from 'src/features/profile/ProfileProvider';
import { useAllowAnonymousIs } from 'src/features/stateless/getAllowAnonymous';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import type { ITextResourceResult, TextResourceMap } from 'src/features/language/textResources/index';

const convertResult = (result: ITextResourceResult): TextResourceMap => {
  const { resources } = result;
  return resourcesAsMap(resources);
};

const useTextResourcesQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchTextResources } = useAppQueries();
  const selectedLanguage = useCurrentLanguage();

  // This makes sure to await potential profile fetching before fetching text resources
  const profile = useProfile();
  const isAnonymous = useAllowAnonymousIs(true);
  const enabled = isAnonymous || profile !== undefined;

  const utils = {
    ...useQuery({
      enabled,
      queryKey: ['fetchTextResources', selectedLanguage],
      queryFn: () => fetchTextResources(selectedLanguage),
      onError: (error: AxiosError) => {
        window.logError('Fetching text resources failed:\n', error);
      },
    }),
    enabled,
  };

  useEffect(() => {
    if (utils.data) {
      dispatch(TextResourcesActions.fetchFulfilled({ resources: utils.data.resources, language: utils.data.language }));
    }
  }, [dispatch, utils.data]);

  return utils;
};

const { Provider, useCtx, useHasProvider } = delayedContext(() =>
  createQueryContext<ITextResourceResult, false, TextResourceMap>({
    name: 'TextResources',
    required: false,
    default: {},
    query: useTextResourcesQuery,
    process: convertResult,
  }),
);

export const TextResourcesProvider = Provider;
export const useTextResources = () => useCtx();
export const useHasTextResources = () => useHasProvider();
