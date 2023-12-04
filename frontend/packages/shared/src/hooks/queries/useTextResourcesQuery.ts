import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ITextResources } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useTextResourcesQuery = (org: string, app: string): UseQueryResult<ITextResources> => {
  const { getTextResources, getTextLanguages } = useServicesContext();
  return useQuery<ITextResources>({
    queryKey: [QueryKey.TextResources, org, app],
    queryFn: async () => {
      const languages = await getTextLanguages(org, app);
      if (languages) {
        const entries = await Promise.all(
          languages.map((language) =>
            getTextResources(org, app, language).then((res) => [language, res.resources ?? []]),
          ),
        );
        return Object.fromEntries(entries);
      } else return {};
      // Todo: Consider creating a backend endpoint that returns this result directly. Making backend calls in a loop is not optimal.
    },
  });
};
