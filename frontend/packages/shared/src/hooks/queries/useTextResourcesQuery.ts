import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ITextResources } from 'app-shared/types/global';
import { QueryKey } from 'app-shared/types/QueryKey';
import { toast } from 'react-toastify';

export const useTextResourcesQuery = (org: string, app: string): UseQueryResult<ITextResources> => {
  const { getTextResources, getTextLanguages } = useServicesContext();
  return useQuery<ITextResources>({
    queryKey: [QueryKey.TextResources, org, app],
    queryFn: async () => {
      const languages = await getTextLanguages(org, app).catch((error) => {
        toast.error('getTextLanguages --- ', error);

        return error;
      });
      if (languages) {
        const entries = await Promise.all(
          languages.map((language) =>
            getTextResources(org, app, language)
              .then((res) => [language, res.resources ?? []])
              .catch((error) => {
                toast.error('getTextResources --- ', error);

                return error;
              }),
          ),
        );
        return Object.fromEntries(entries);
      } else return {};
      // Todo: Consider creating a backend endpoint that returns this result directly. Making backend calls in a loop is not optimal.
    },
  });
};
