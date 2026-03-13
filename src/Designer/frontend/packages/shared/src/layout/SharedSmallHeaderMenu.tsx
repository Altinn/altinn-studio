import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton, StudioParagraph, StudioAvatar } from '@studio/components';
import type { StudioProfileMenuGroup, StudioProfileMenuItem } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { DropdownMenu } from '@digdir/designsystemet-react';
import type { User } from 'app-shared/types/Repository';

type SharedSmallHeaderMenuProps = {
  user: User;
  profileMenuGroups: StudioProfileMenuGroup[];
};

export function SharedSmallHeaderMenu({
  user,
  profileMenuGroups,
}: SharedSmallHeaderMenuProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);

  const handleClose = () => setOpen(false);

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={() => setOpen((isOpen) => !isOpen)}
          icon={<MenuHamburgerIcon />}
          variant='tertiary'
          data-color='neutral'
        >
          {t('top_menu.menu')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <ProfileSection user={user} />
        {profileMenuGroups.map((group, index) => (
          <DropdownMenu.Group key={index}>
            {group.items.map((item) => (
              <SmallMenuItem key={item.itemName} item={item} onClose={handleClose} />
            ))}
          </DropdownMenu.Group>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

type SmallMenuItemProps = {
  item: StudioProfileMenuItem;
  onClose: () => void;
};

function SmallMenuItem({ item, onClose }: SmallMenuItemProps): ReactElement {
  if (item.action.type === 'button') {
    const { onClick } = item.action;
    const handleClick = () => {
      onClick();
      onClose();
    };
    return <DropdownMenu.Item onClick={handleClick}>{item.itemName}</DropdownMenu.Item>;
  }

  const { href, openInNewTab } = item.action;
  return (
    <DropdownMenu.Item asChild>
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        onClick={onClose}
      >
        {item.itemName}
      </a>
    </DropdownMenu.Item>
  );
}

type ProfileSectionProps = {
  user: User;
};

function ProfileSection({ user }: ProfileSectionProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}>
      <StudioAvatar
        src={user?.avatar_url}
        alt={t('general.profile_icon')}
        title={t('shared.header_profile_icon_text')}
      />
      <StudioParagraph data-size='md'>{user?.full_name || user?.login}</StudioParagraph>
    </div>
  );
}
