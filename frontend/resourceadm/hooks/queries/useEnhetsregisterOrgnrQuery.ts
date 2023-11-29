import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  BrregOrganizationResult,
  BrregUnderOrganizationResult,
} from 'app-shared/types/ResourceAdm';
import { get } from 'app-shared/utils/networking';
import { AxiosError } from 'axios';

export const useEnhetsregisterEnhetOrgnrQuery = (
  orgnummere: string[],
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  const orgnummereJoined = orgnummere.join(',');
  return useQuery<BrregOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterOrgenhetSearch, orgnummereJoined],
    () =>
      get(
        `https://data.brreg.no/enhetsregisteret/api/enheter?organisasjonsnummer=${orgnummereJoined}&size=10000`,
      ),
    { enabled: orgnummere.length > 0 },
  );
};

export const useEnhetsregisterUnderenhetOrgnrQuery = (
  orgnummere: string[],
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  const orgnummereJoined = orgnummere.join(',');
  return useQuery<BrregUnderOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterUnderenhetSearch, orgnummereJoined],
    () =>
      get(
        `https://data.brreg.no/enhetsregisteret/api/underenheter?organisasjonsnummer=${orgnummereJoined}&size=10000`,
      ),
    { enabled: orgnummere.length > 0 },
  );
};
