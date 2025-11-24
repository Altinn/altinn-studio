import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import type { IAppLanguage } from 'src/types/shared';

export function useGetAppLanguageQuery(enabled: boolean) {
  const { fetchAppLanguages } = useAppQueries();
  const utils = useQuery({
    queryKey: ['fetchAppLanguages'],
    queryFn: () => fetchAppLanguages(),
    enabled,
    select,
  });

  useEffect(() => {
    if (utils.data && new Set(utils.data).size < utils.data.length) {
      window.logError(`Found multiple text resource files with the same 'language', languages found:\n`, utils.data);
    }
  }, [utils.data]);

  return utils;
}

function select(appLanguages: IAppLanguage[]) {
  return appLanguages.map((lang) => lang.language);
}

// import { useEffect, useMemo } from 'react';
//
// import type { IAppLanguage } from 'src/types/shared';
//
// export function useGetAppLanguageQuery() {
//   const appLanguages = window.AltinnAppData?.availableLanguages;
//
//   const data = useMemo(() => {
//     if (!appLanguages) {
//       return undefined;
//     }
//     return select(appLanguages);
//   }, [appLanguages]);
//
//   useEffect(() => {
//     if (data && new Set(data).size < data.length) {
//       window.logError(`Found multiple text resource files with the same 'language', languages found:\n`, data);
//     }
//   }, [data]);
//
//   return {
//     data,
//     error: null,
//     isFetching: false,
//   };
// }
//
// function select(appLanguages: IAppLanguage[]) {
//   return appLanguages.map((lang) => lang.language);
// }
