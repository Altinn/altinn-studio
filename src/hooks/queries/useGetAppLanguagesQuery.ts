import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';

export function useGetAppLanguageQuery() {
  const { fetchAppLanguages } = useAppQueries();
  return useQuery({
    queryKey: ['fetchAppLanguages'],
    queryFn: () => fetchAppLanguages(),
  });
}
