import { Organization } from './../../dashboard/services/organizationService';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from '../common/ServiceContext';


enum ServerStateCacheKey {
  GetOrganization = 'GET_ORGANIZATION',
}
/* 
export const useOrganizationQuery = (): UseQueryResult<Organization> => {
  const { getOrganizations } = useServicesContext();
  return useQuery<Organization>([ServerStateCacheKey.GetOrganization], () => getOrganizations());



};
 */


