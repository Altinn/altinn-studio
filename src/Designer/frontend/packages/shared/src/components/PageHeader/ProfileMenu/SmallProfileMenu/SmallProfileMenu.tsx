import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';
import type { StudioProfileMenuGroup } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { TriggerButton } from './TriggerButton';
import { Items } from './Items';

export type SmallProfileMenuProps = {
  triggerButtonText: string;
  items: StudioProfileMenuGroup[];
};

export const SmallProfileMenu = ({
  triggerButtonText,
  items,
}: SmallProfileMenuProps): ReactElement => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);

  const toggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={toggleMenu}
          icon={<MenuHamburgerIcon />}
          variant='tertiary'
          data-color='neutral'
        >
          {t('top_menu.menu')}
        </StudioButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <TriggerButton triggerButtonText={triggerButtonText} />
        <Items items={items} onClose={handleClose} />
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
