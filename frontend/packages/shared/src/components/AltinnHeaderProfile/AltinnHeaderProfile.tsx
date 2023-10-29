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

  console.log('AltinnHeaderProfile - user in header', user);
  console.log('AltinnHeaderProfile - repository in header', repository);
  console.log('AltinnHeaderProfile - org in header', org);

  // IT is only repo that is null, user does not get null.
  // Should we still display the profile stuff when we dont have repo?
  //   - Can have everything except the "open repo" button present

  // Org can also be invalid at this part
  // If we have org - run old userNameAndOrg, else run user only
  // We can also have org, but an invalid org! control from parent!

  return (
    <div className={classes.profileMenuWrapper}>
      {/*user && repository && (
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
        )*/}
      <ProfileMenu showlogout user={user} userNameAndOrg={'123'} />
    </div>
  );
};
