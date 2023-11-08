import { ProfileMenu } from 'app-shared/navigation/main-header/ProfileMenu';
import { Repository } from 'app-shared/types/Repository';
import { User } from 'app-shared/types/User';
import React, { ReactNode } from 'react';
import classes from './AltinnHeaderProfile.module.css';
import { useUserNameAndOrg } from './hooks/useUserNameAndOrg';

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
  const userNameAndOrg = useUserNameAndOrg(user, org, repository);

  return (
    <div className={classes.profileMenuWrapper}>
      {user && (
        <ProfileMenu
          showlogout
          user={user}
          userNameAndOrg={userNameAndOrg}
          repositoryError={!repository}
        />
      )}
    </div>
  );
};
