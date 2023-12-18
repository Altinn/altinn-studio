import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  BrregOrganizationResult,
  BrregUnderOrganizationResult,
} from 'app-shared/types/ResourceAdm';
import { AxiosError } from 'axios';

const getQueryUrl = (enhetType: string, search: string) => {
  const isOrgnrSearch = /^\d{9}$/.test(search); // regex for at search er eksakt 9 siffer
  const searchTerm = isOrgnrSearch ? `organisasjonsnummer=${search}` : `navn=${search}`;
  return `https://data.brreg.no/enhetsregisteret/api/${enhetType}?${searchTerm}&sort=navn,ASC`;
};

export const useEnhetsregisterOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  const { getEnheter } = useServicesContext();

  return useQuery<BrregOrganizationResult, AxiosError>({
    queryKey: [QueryKey.EnhetsregisterOrgenhetSearch, navn],
    queryFn: () => getEnheter(getQueryUrl('enheter', navn)),
    enabled: !!navn,
  });
};

export const useEnhetsregisterUnderOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  const { getUnderenheter } = useServicesContext();

  return useQuery<BrregUnderOrganizationResult, AxiosError>({
    queryKey: [QueryKey.EnhetsregisterUnderenhetSearch, navn],
    queryFn: () => getUnderenheter(getQueryUrl('underenheter', navn)),
    enabled: !!navn,
  });
};
