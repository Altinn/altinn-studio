import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  BrregOrganizationResult,
  BrregUnderOrganizationResult,
} from 'app-shared/types/ResourceAdm';
import { get } from 'app-shared/utils/networking';
import { AxiosError } from 'axios';

const getSearchTerm = (search: string) => {
  const isOrgnrSearch = /^\d{9}$/.test(search); // regex for at search er eksakt 9 siffer
  return isOrgnrSearch ? `organisasjonsnummer=${search}` : `navn=${search}`;
};

export const useEnhetsregisterOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  return useQuery<BrregOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterOrgenhetSearch, navn],
    () =>
      get(
        `https://data.brreg.no/enhetsregisteret/api/enheter?${getSearchTerm(navn)}&sort=navn,ASC`,
      ),
    { enabled: !!navn },
  );
};

export const useEnhetsregisterUnderOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  return useQuery<BrregUnderOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterUnderenhetSearch, navn],
    () =>
      get(
        `https://data.brreg.no/enhetsregisteret/api/underenheter?${getSearchTerm(
          navn,
        )}&sort=navn,ASC`,
      ),
    { enabled: !!navn },
  );
};
