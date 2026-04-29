import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAvatar, StudioPageHeader } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import { useUserQuery } from 'app-shared/hooks/queries';

export type LargeProfileMenuProps = {
  triggerButtonText: string;
  items?: StudioProfileMenuGroup[];
};

export const LargeProfileMenu = ({
  triggerButtonText,
  items,
}: LargeProfileMenuProps): ReactElement | null => {
  const { t } = useTranslation();
  const { data: user } = useUserQuery();

  if (!user) {
    return null;
  }

  return (
    <StudioPageHeader.ProfileMenu
      triggerButtonText={triggerButtonText}
      profileImage={
        <StudioAvatar
          src={user.avatar_url}
          alt={t('general.profile_icon')}
          title={t('shared.header_profile_icon_text')}
        />
      }
      profileMenuGroups={items}
    />
  );
};
