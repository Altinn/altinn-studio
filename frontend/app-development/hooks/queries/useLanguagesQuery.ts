import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

type LanguageList = string[];

export const useLanguagesQuery = (owner, app): UseQueryResult<LanguageList> => {
  const { getTextLanguages } = useServicesContext();
  return useQuery<LanguageList>([QueryKey.TextLanguages, owner, app], () =>
    getTextLanguages(owner, app)
  );
};
