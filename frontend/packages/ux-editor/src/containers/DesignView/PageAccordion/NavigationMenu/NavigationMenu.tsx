import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@navikt/aksel-icons';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedFormLayoutSetName } from '../../../../hooks';
import { StudioButton } from '@studio/components';

export type NavigationMenuProps = {
  pageName: string;
  pageIsReceipt: boolean;
};

/**
 * @component
 *    Displays the buttons to move a page accordion up or down, edit the name and delete the page
 *
 * @property {string}[pageName] - The name of the page
 * @property {boolean}[pageIsReceipt] - If the page is a receipt page
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NavigationMenu = ({ pageName, pageIsReceipt }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();

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

  const settingsRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const moveLayout = (action: 'up' | 'down') => {
    if (action === 'up' || action === 'down') {
      updateLayoutOrder({ layoutName: pageName, direction: action });
    }
    setDropdownOpen(false);
  };

  return (
    <div>
      <StudioButton
        icon={<MenuElipsisVerticalIcon />}
        onClick={() => setDropdownOpen((v) => !v)}
        aria-haspopup='menu'
        variant='tertiary'
        title={t('general.options')}
        size='small'
        ref={settingsRef}
      />
      <DropdownMenu
        anchorEl={settingsRef.current}
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
        portal
        size='small'
      >
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            {!pageIsReceipt && (
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
            )}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
