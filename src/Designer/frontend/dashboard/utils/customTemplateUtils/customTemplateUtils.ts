import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import type { Organization } from 'app-shared/types/Organization';
import { getOrgNameByUsername } from '../userUtils';

export const groupTemplatesByOwner = (
  templates: CustomTemplate[],
  organizations: Organization[],
): Record<string, CustomTemplate[]> => {
  return Object.groupBy(templates, (template) => retrieveOwnerName(template.owner, organizations));
};

const retrieveOwnerName = (templateOwnerName: string, organizations: Organization[]): string => {
  return getOrgNameByUsername(templateOwnerName, organizations) || templateOwnerName;
};
