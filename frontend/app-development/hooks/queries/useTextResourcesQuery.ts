import { useServicesContext } from '../../common/ServiceContext';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { ITextResources } from 'app-shared/types/global';
import { QueryKey } from '../../types/QueryKey';

export const useTextResourcesQuery =
  (org: string, app: string): UseQueryResult<ITextResources> => {
    const { getTextResources, getTextLanguages } = useServicesContext();
    return useQuery<ITextResources>(
      [QueryKey.TextResources, org, app],
      async () => {
        const textResources: ITextResources = {};
        const languages = await getTextLanguages(org, app);
        if (languages) {
          for (const language of languages) {
            await getTextResources(org, app, language).then((res) => {
              textResources[language] = res.resources ?? [];
            })
          }
        }
        return textResources;
        // Todo: Consider creating a backend endpoint that returns this result directly. Making backend calls in a loop is not optimal.
      },
    );
  };
