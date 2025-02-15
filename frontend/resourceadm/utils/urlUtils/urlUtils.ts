import type { NavigationBarPage } from '../../types/NavigationBarPage';
import { isOrgNrString } from '../stringUtils';
import { UrlConstants } from './urlConstants';

/**
 * Returns the path to the dashboard based on the name of the organisation
 * and the name of the repo.
 *
 * @param organisation the organisation name
 * @param repo the repo name
 *
 * @returns the path
 */
export const getResourceDashboardURL = (organisation: string, repo: string): string => {
  return `/${organisation}/${repo}`;
};

/**
 * Returns the path to the resource page, default set to the about page.
 * This is done based on the name of the organisation, the name of the repo,
 * and the resource Id
 *
 * @param organisation the organisation name
 * @param repo the repo name
 * @param resourceId the ID of the resource
 * @param resourcePage the type of page in the resource page to view
 *
 * @returns the path
 */
export const getResourcePageURL = (
  organisation: string,
  repo: string,
  resourceId: string,
  resourcePage: NavigationBarPage,
): string => {
  return `/${organisation}/${repo}/resource/${resourceId}/${resourcePage}`;
};

export const getAccessListPageUrl = (
  organisation: string,
  repo: string,
  environment: string,
  listIdentifier: string = '',
): string => {
  return `/${organisation}/${repo}/accesslists/${environment}/${listIdentifier}`;
};

export const getPartiesQueryUrl = (search: string, isSubParty?: boolean): string => {
  const partyType = isSubParty ? 'underenheter' : 'enheter';
  const isOrgnrSearch = isOrgNrString(search);
  const searchTerm = isOrgnrSearch ? `organisasjonsnummer=${search}` : `navn=${search}`;
  return `${UrlConstants.BRREG}${partyType}?${searchTerm}&size=10`;
};
