import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../../common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

type LanguageList = string[];

export const useLanguagesQuery = (owner, app): UseQueryResult<LanguageList> => {
  const { getTextLanguages } = useServicesContext();
  return useQuery<LanguageList>([QueryKey.TextLanguages, owner, app], () =>
    getTextLanguages(owner, app)
  );
};
