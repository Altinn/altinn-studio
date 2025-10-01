import { useEffect, useMemo } from 'react';

import type { IAppLanguage } from 'src/types/shared';

export function useGetAppLanguageQuery() {
  const appLanguages = window.AltinnAppData?.appLanguages;

  const data = useMemo(() => {
    if (!appLanguages) {
      return undefined;
    }
    return select(appLanguages);
  }, [appLanguages]);

  useEffect(() => {
    if (data && new Set(data).size < data.length) {
      window.logError(`Found multiple text resource files with the same 'language', languages found:\n`, data);
    }
  }, [data]);

  return {
    data,
    error: null,
    isFetching: false,
  };
}

function select(appLanguages: IAppLanguage[]) {
  return appLanguages.map((lang) => lang.language);
}
