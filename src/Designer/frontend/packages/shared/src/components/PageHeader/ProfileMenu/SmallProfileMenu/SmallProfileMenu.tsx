import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioDropdown } from '@designer/components';
import type { StudioProfileMenuGroup } from '@designer/components';
import { MenuHamburgerIcon } from '@designer/icons';
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

  return (
    <StudioDropdown
      icon={<MenuHamburgerIcon />}
      triggerButtonText={t('top_menu.menu')}
      triggerButtonVariant='tertiary'
      data-color='neutral'
    >
      <TriggerButton triggerButtonText={triggerButtonText} />
      <Items items={items} />
    </StudioDropdown>
  );
};
