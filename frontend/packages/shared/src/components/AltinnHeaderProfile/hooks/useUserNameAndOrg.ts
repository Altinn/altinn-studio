import { Repository } from 'app-shared/types/Repository';
import { User } from 'app-shared/types/User';
import i18next from 'i18next';

/**
 * Hook that returns the username and org of a logged in user.
 *
 * @param user the User that is logged in
 * @param org the organisatio of the user
 * @param repository the reposiroty the application is in
 * @param t translation function
 *
 * @returns {string} - The username and org
 */
export const useUserNameAndOrg = (
  user: User,
  org: string,
  repository: Repository,
  t: typeof i18next.t,
): string => {
  const getUserNameAndOrg = () => {
    const userName: string = user?.full_name || user?.login;
    if (!repository) return userName;
    if (org && user.login !== org) {
      return t('shared.header_user_for_org', {
        user: user.full_name || user.login,
        org: repository.owner.full_name || repository.owner.login,
      });
    }
    return userName;
  };

  return getUserNameAndOrg();
};
