import { ProfileMenu } from 'app-shared/navigation/main-header/ProfileMenu';
import { Repository } from 'app-shared/types/Repository';
import { User } from 'app-shared/types/User';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import classes from './AltinnHeaderProfile.module.css';

export interface AltinnHeaderProfileProps {
  user: User;
  org: string;
  repository: Repository;
}

/**
 * @component
 *    Dispalys the Heacer Profile in the Altinn header
 *
 * @property {User}[user] - the user
 * @property {string}[org] - the org
 * @property {Repository}[repository] - the repository
 *
 * @returns {ReactNode} - The Rendered component
 */
export const AltinnHeaderProfile = ({
  user,
  repository,
  org,
}: AltinnHeaderProfileProps): ReactNode => {
  const { t } = useTranslation();

  return (
    <div className={classes.profileMenuWrapper}>
      {user && repository && (
        <ProfileMenu
          showlogout
          user={user}
          userNameAndOrg={
            org && user.login !== org
              ? t('shared.header_user_for_org', {
                  user: user.full_name || user.login,
                  org: repository.owner.full_name || repository.owner.login,
                })
              : user.full_name || user.login
          }
        />
      )}
    </div>
  );
};
