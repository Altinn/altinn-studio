import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import {
  BrregOrganizationResult,
  BrregUnderOrganizationResult,
} from 'app-shared/types/ResourceAdm';
import { get } from 'app-shared/utils/networking';
import { AxiosError } from 'axios';

export const useEnhetsregisterOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregOrganizationResult, AxiosError> => {
  return useQuery<BrregOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterOrgenhetSearch, navn],
    () => get(`https://data.brreg.no/enhetsregisteret/api/enheter?navn=${navn}&sort=navn,ASC`),
  );
};

export const useEnhetsregisterUnderOrganizationQuery = (
  navn: string,
): UseQueryResult<BrregUnderOrganizationResult, AxiosError> => {
  return useQuery<BrregUnderOrganizationResult, AxiosError>(
    [QueryKey.EnhetsregisterUnderenhetSearch, navn],
    () => get(`https://data.brreg.no/enhetsregisteret/api/underenheter?navn=${navn}&sort=navn,ASC`),
  );
};
