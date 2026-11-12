import type * as CBTypes from '@app/layout-contract/generated/components/CustomButton/config.generated';

import { httpPost } from 'src/utils/network/networking';
import { getActionsUrl } from 'src/utils/urls/appUrlHelper';
import type { BackendValidationIssueGroups } from 'src/features/validation';
import type { IInstance } from 'src/types/shared';

type UpdatedDataModels = {
  [dataElementId: string]: object;
};

/**
 * This is the format we get from app-lib, it turns out mapping BackendValidationIssueGroups on a per-dataelement basis is unnecessary,
 * and so this mapping is simply un-done after receiving it. To avoid breaking changes which would require handling multiple
 * formats in app-frontend, we decided to leave it as is for now, as it does not have any practical consequences. In a future
 * major/breaking release which would require a specific backend version, this could be changed to simply return a single BackendValidationIssueGroups object.
 */
type UpdatedValidationIssues = {
  [dataElementId: string]: BackendValidationIssueGroups;
};

export type ActionResult = {
  instance: IInstance | undefined;
  updatedDataModels?: UpdatedDataModels;
  updatedValidationIssues?: UpdatedValidationIssues;
  clientActions?: CBTypes.ClientAction[];
  redirectUrl: string;
};

export type UserActionRequest = {
  action?: string;
  buttonId?: string;
  metadata?: Record<string, string>;
  ignoredValidators?: string[];
  onBehalfOf?: string;
};

export const doPerformAction = async (
  partyId: string,
  instanceGuid: string,
  actionRequest: UserActionRequest,
  language: string,
): Promise<ActionResult> => {
  const response = await httpPost<ActionResult>(
    getActionsUrl(partyId, instanceGuid, language),
    undefined,
    actionRequest,
  );
  if (response.status < 200 || response.status >= 300) {
    throw new Error('Failed to perform action');
  }

  return response.data;
};
