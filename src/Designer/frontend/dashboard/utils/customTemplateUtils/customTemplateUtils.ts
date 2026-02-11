import type { CustomTemplate } from 'app-shared/types/CustomTemplate';
import type { Organization } from 'app-shared/types/Organization';
import { getOrgNameByUsername } from '../userUtils';

export const groupTemplatesByOwner = (
  templates: CustomTemplate[],
  organizations: Organization[],
) => {
  return templates.reduce(
    (groups, template) => {
      const owner = getOrgNameByUsername(template.owner, organizations) || template.owner;
      if (!groups[owner]) {
        groups[owner] = [];
      }
      groups[owner].push(template);
      return groups;
    },
    {} as Record<string, CustomTemplate[]>,
  );
};
