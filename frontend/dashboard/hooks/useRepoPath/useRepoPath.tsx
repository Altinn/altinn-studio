import { useContext } from 'react';
import { repositoryBasePath, repositoryOwnerPath } from 'app-shared/api/paths';
import { getOrgUsernameByUsername } from 'dashboard/utils/userUtils';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';
import { HeaderContext } from 'dashboard/context/HeaderContext';

export const useRepoPath = () => {
  const { user, selectableOrgs } = useContext(HeaderContext);

  const selectedContext = useSelectedContext();
  const org = getOrgUsernameByUsername(selectedContext, selectableOrgs);

  const owner = org || user?.login;
  if (owner) {
    return repositoryOwnerPath(owner);
  }
  return repositoryBasePath();
};
