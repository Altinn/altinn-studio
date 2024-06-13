import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';

export function useGetAppLanguageQuery() {
  const { fetchAppLanguages } = useAppQueries();
  return useQuery({
    queryKey: ['fetchAppLanguages'],
    queryFn: () => fetchAppLanguages(),
    select: (appLanguages) => appLanguages.map((lang) => lang.language),
  });
}
