import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@studio/icons';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { StudioButton } from '@studio/components';

export type NavigationMenuProps = {
  pageName: string;
};

/**
 * @component
 *    Displays the buttons to move a page accordion up or down, edit the name and delete the page
 *
 * @property {string}[pageName] - The name of the page
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NavigationMenu = ({ pageName }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();

  const { selectedFormLayoutSetName } = useAppContext();

  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const layoutOrder = formLayoutSettings?.pages?.order;
  const disableUp = layoutOrder.indexOf(pageName) === 0;
  const disableDown = layoutOrder.indexOf(pageName) === layoutOrder.length - 1;

  const { mutate: updateLayoutOrder } = useUpdateLayoutOrderMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const moveLayout = (action: 'up' | 'down') => {
    if (action === 'up' || action === 'down') {
      updateLayoutOrder({ layoutName: pageName, direction: action });
    }
    setDropdownOpen(false);
  };

  return (
    <div>
      <DropdownMenu open={dropdownOpen} onClose={() => setDropdownOpen(false)} portal size='small'>
        <DropdownMenu.Trigger asChild>
          <StudioButton
            icon={<MenuElipsisVerticalIcon />}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup='menu'
            variant='tertiary'
            title={t('general.options')}
            size='small'
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <>
              <DropdownMenu.Item
                onClick={() => !disableUp && moveLayout('up')}
                disabled={disableUp}
                id='move-page-up-button'
              >
                <ArrowUpIcon />
                {t('ux_editor.page_menu_up')}
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => !disableDown && moveLayout('down')}
                disabled={disableDown}
                id='move-page-down-button'
              >
                <ArrowDownIcon />
                {t('ux_editor.page_menu_down')}
              </DropdownMenu.Item>
            </>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
