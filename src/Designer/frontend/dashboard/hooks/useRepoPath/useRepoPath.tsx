import { repositoryBasePath, repositoryOwnerPath } from 'app-shared/api/paths';
import { getOrgUsernameByUsername } from '../../utils/userUtils';
import { useSelectedContext } from '../useSelectedContext';
import type { User } from 'app-shared/types/Repository';
import type { Organization } from 'app-shared/types/Organization';

export const useRepoPath = (user: User, selectableOrgs: Organization[]) => {
  const selectedContext = useSelectedContext();
  const org = getOrgUsernameByUsername(selectedContext, selectableOrgs);

  const owner = org || user?.login;
  if (owner) {
    return repositoryOwnerPath(owner);
  }
  return repositoryBasePath();
};
