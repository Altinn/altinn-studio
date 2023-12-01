import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  BrregOrganizationResult,
  BrregUnderOrganizationResult,
} from 'app-shared/types/ResourceAdm';
import { get } from 'app-shared/utils/networking';
import { AxiosError } from 'axios';

const getQueryUrl = (enhetType: string, search: string) => {
  const isOrgnrSearch = /^\d{9}$/.test(search); // regex for at search er eksakt 9 siffer
  const searchTerm = isOrgnrSearch ? `organisasjonsnummer=${search}` : `navn=${search}`;
  return `https://data.brreg.no/enhetsregisteret/api/${enhetType}?${searchTerm}&sort=navn,ASC`;
};

export const useEnhetsregisterOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  return useQuery<BrregOrganizationResult, AxiosError>({
    queryKey: [QueryKey.EnhetsregisterOrgenhetSearch, navn],
    queryFn: () => get(getQueryUrl('enheter', navn)),
    enabled: !!navn,
  });
};

export const useEnhetsregisterUnderOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  return useQuery<BrregUnderOrganizationResult, AxiosError>({
    queryKey: [QueryKey.EnhetsregisterUnderenhetSearch, navn],
    queryFn: () => get(getQueryUrl('underenheter', navn)),
    enabled: !!navn,
  });
};
