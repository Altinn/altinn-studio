import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../../hooks';
import { StudioButton } from '@studio/components-legacy';
import { usePagesQuery } from '../../../../hooks/queries/usePagesQuery';
import { useChangePageOrderMutation } from '../../../../hooks/mutations/useChangePageOrderMutation';

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
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);
  const { mutate: changePageOrder } = useChangePageOrderMutation(
    org,
    app,
    selectedFormLayoutSetName,
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const pageIndex = pagesModel.pages?.findIndex((page) => page.id === pageName);
  const disableUp = pageIndex === 0;
  const disableDown = pageIndex === pagesModel.pages?.length - 1;

  const moveLayoutUp = () => {
    const page = pagesModel.pages.splice(pageIndex, 1)[0];
    pagesModel.pages.splice(pageIndex - 1, 0, page);
    changePageOrder(pagesModel);
    setDropdownOpen(false);
  };

  const moveLayoutDown = () => {
    const page = pagesModel.pages.splice(pageIndex, 1)[0];
    pagesModel.pages.splice(pageIndex + 1, 0, page);
    changePageOrder(pagesModel);
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
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Item
              onClick={() => !disableUp && moveLayoutUp()}
              disabled={disableUp}
              id='move-page-up-button'
            >
              <ArrowUpIcon />
              {t('ux_editor.page_menu_up')}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => !disableDown && moveLayoutDown()}
              disabled={disableDown}
              id='move-page-down-button'
            >
              <ArrowDownIcon />
              {t('ux_editor.page_menu_down')}
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
