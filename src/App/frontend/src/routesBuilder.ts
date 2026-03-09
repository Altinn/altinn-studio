import { TaskKeys } from 'src/hooks/useNavigatePage';

/**
 * Route path patterns — must match the current URL segments exactly.
 */
export const routes = {
  root: '/',
  instanceSelection: 'instance-selection',
  partySelection: 'party-selection',
  partySelectionCatchAll: 'party-selection/*',
  partySelectionLegacy: 'partyselection',
  partySelectionLegacyCatchAll: 'partyselection/*',
  statelessPage: ':pageKey',
  instance: 'instance/:instanceOwnerPartyId/:instanceGuid',
  processEnd: `instance/:instanceOwnerPartyId/:instanceGuid/${TaskKeys.ProcessEnd}`,
  task: ':taskId',
  page: ':pageKey',
  component: ':componentId',
  componentCatchAll: ':componentId/*',
} as const;

export function buildInstanceUrl(instanceOwnerPartyId: string | number, instanceGuid: string): string {
  return `/instance/${instanceOwnerPartyId}/${instanceGuid}`;
}

export function buildTaskUrl(instanceOwnerPartyId: string | number, instanceGuid: string, taskId: string): string {
  return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}`;
}

export function buildPageUrl(
  instanceOwnerPartyId: string | number,
  instanceGuid: string,
  taskId: string,
  pageKey: string,
): string {
  return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${taskId}/${pageKey}`;
}

export function buildProcessEndUrl(instanceOwnerPartyId: string | number, instanceGuid: string): string {
  return `/instance/${instanceOwnerPartyId}/${instanceGuid}/${TaskKeys.ProcessEnd}`;
}

export function buildPartySelectionUrl(): string {
  return '/party-selection';
}
