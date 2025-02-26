import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import type { IAppLanguage } from 'src/types/shared';

export function useGetAppLanguageQuery(enabled: boolean) {
  const { fetchAppLanguages } = useAppQueries();
  return useQuery({
    queryKey: ['fetchAppLanguages'],
    queryFn: () => fetchAppLanguages(),
    enabled,
    select,
  });
}

function select(appLanguages: IAppLanguage[]) {
  return appLanguages.map((lang) => lang.language);
}
