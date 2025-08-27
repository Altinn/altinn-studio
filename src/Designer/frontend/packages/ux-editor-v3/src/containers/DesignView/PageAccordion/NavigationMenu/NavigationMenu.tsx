import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from 'libs/studio-icons/src';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useUpdateLayoutNameMutation } from '../../../../hooks/mutations/useUpdateLayoutNameMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useSelector } from 'react-redux';
import type { IAppState } from '../../../../types/global';
import { useSearchParams } from 'react-router-dom';
import { InputPopover } from './InputPopover';
import { ObjectUtils } from 'libs/studio-pure-functions/src';
import { useAppContext } from '../../../../hooks/useAppContext';
import { StudioButton } from 'libs/studio-components-legacy/src';

export type NavigationMenuProps = {
  pageName: string;
  pageIsReceipt: boolean;
};

/**
 * @component
 *    Displays the buttons to move a page accoridon up or down, edit the name and delete the page
 *
 * @property {string}[pageName] - The name of the page
 * @property {boolean}[pageIsReceipt] - If the page is a receipt page
 *
 * @returns {JSX.Element} - The rendered component
 */
export const NavigationMenu = ({ pageName, pageIsReceipt }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();

  const { selectedLayoutSet } = useAppContext();
  const invalidLayouts: string[] = useSelector(
    (state: IAppState) => state.formDesigner.layout.invalidLayouts,
  );
  const invalid = invalidLayouts.includes(pageName);

  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);

  const layoutOrder = formLayoutSettings?.pages?.order;
  const disableUp = layoutOrder.indexOf(pageName) === 0;
  const disableDown = layoutOrder.indexOf(pageName) === layoutOrder.length - 1;

  const { mutate: updateLayoutOrder } = useUpdateLayoutOrderMutation(org, app, selectedLayoutSet);
  const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(org, app, selectedLayoutSet);

  const [searchParams, setSearchParams] = useSearchParams();

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const moveLayout = (action: 'up' | 'down') => {
    if (action === 'up' || action === 'down') {
      updateLayoutOrder({ layoutName: pageName, direction: action });
    }
    setDropdownOpen(false);
  };

  const handleSaveNewName = (newName: string) => {
    updateLayoutName({ oldName: pageName, newName });
    setSearchParams({ ...ObjectUtils.deepCopy(searchParams), layout: newName });
  };

  return (
    <div>
      <DropdownMenu open={dropdownOpen} onClose={() => setDropdownOpen(false)} portal size='small'>
        <DropdownMenu.Trigger asChild>
          <StudioButton
            icon={<MenuElipsisVerticalIcon />}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup='menu'
            aria-expanded={dropdownOpen}
            variant='tertiary'
            title={t('general.options')}
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            {!pageIsReceipt && (
              <>
                <DropdownMenu.Item
                  onClick={() => !(disableUp || invalid) && moveLayout('up')}
                  disabled={disableUp || invalid}
                  id='move-page-up-button'
                >
                  <ArrowUpIcon />
                  {t('ux_editor.page_menu_up')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => !(disableDown || invalid) && moveLayout('down')}
                  disabled={disableDown || invalid}
                  id='move-page-down-button'
                >
                  <ArrowDownIcon />
                  {t('ux_editor.page_menu_down')}
                </DropdownMenu.Item>
              </>
            )}
            <InputPopover
              oldName={pageName}
              disabled={invalid}
              layoutOrder={layoutOrder}
              saveNewName={handleSaveNewName}
              onClose={() => setDropdownOpen(false)}
            />
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
