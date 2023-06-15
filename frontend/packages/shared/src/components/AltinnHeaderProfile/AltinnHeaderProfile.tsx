import { ProfileMenu } from 'app-shared/navigation/main-header/ProfileMenu';
import { Repository } from 'app-shared/types/Repository';
import { User } from 'app-shared/types/User';
import React from 'react';
import { useTranslation } from 'react-i18next';
import classes from './AltinnHeaderProfile.module.css';

export interface AltinnHeaderProfileProps {
  user: User;
  org: string;
  repository: Repository;
}

export const AltinnHeaderProfile = ({ user, repository, org }: AltinnHeaderProfileProps) => {
  const { t } = useTranslation();

  return (
    <div className={classes.profileMenuWrapper}>
      {user && repository && (
        <>
          <span className={classes.userOrgNames}>
            {org && user.login !== org
              ? t('shared.header_user_for_org', {
                  user: user.full_name || user.login,
                  org: repository.owner.full_name || repository.owner.login,
                })
              : user.full_name || user.login}
          </span>
          <ProfileMenu showlogout user={user} />
        </>
      )}
    </div>
  );
};
