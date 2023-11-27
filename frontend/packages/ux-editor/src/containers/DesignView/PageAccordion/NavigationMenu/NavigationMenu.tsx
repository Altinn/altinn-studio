import React, { ReactNode, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@navikt/aksel-icons';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useUpdateLayoutNameMutation } from '../../../../hooks/mutations/useUpdateLayoutNameMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import { useDeleteLayoutMutation } from '../../../../hooks/mutations/useDeleteLayoutMutation';
import type { IAppState } from '../../../../types/global';
import { Divider } from 'app-shared/primitives';
import { useSearchParams } from 'react-router-dom';
import { firstAvailableLayout } from '../../../../utils/formLayoutsUtils';
import { InputPopover } from './InputPopover';
import { deepCopy } from 'app-shared/pure';
import { useAppContext } from '../../../../hooks/useAppContext';
import { DeletePopover } from './DeletePopover';

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
 * @returns {ReactNode} - The rendered component
 */
export const NavigationMenu = ({ pageName, pageIsReceipt }: NavigationMenuProps): ReactNode => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

  const { selectedLayoutSet } = useAppContext();
  const invalidLayouts: string[] = useSelector(
    (state: IAppState) => state.formDesigner.layout.invalidLayouts,
  );
  const invalid = invalidLayouts.includes(pageName);

  const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);

  const layoutOrder = formLayoutSettings?.pages.order;
  const disableUp = layoutOrder.indexOf(pageName) === 0;
  const disableDown = layoutOrder.indexOf(pageName) === layoutOrder.length - 1;

  const { mutate: updateLayoutOrder } = useUpdateLayoutOrderMutation(org, app, selectedLayoutSet);
  const { mutate: deleteLayout } = useDeleteLayoutMutation(org, app, selectedLayoutSet);
  const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(org, app, selectedLayoutSet);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout = searchParams.get('layout');

  const settingsRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const moveLayout = (action: 'up' | 'down') => {
    if (action === 'up' || action === 'down') {
      updateLayoutOrder({ layoutName: pageName, direction: action });
    }
    setDropdownOpen(false);
  };

  const handleConfirmDelete = () => {
    deleteLayout(pageName);

    if (selectedLayout === pageName) {
      const layoutToSelect = firstAvailableLayout(pageName, layoutOrder);
      setSearchParams({ layout: layoutToSelect });
    }
  };

  const handleSaveNewName = (newName: string) => {
    updateLayoutName({ oldName: pageName, newName });
    setSearchParams({ ...deepCopy(searchParams), layout: newName });
  };

  return (
    <div>
      <Button
        icon={<MenuElipsisVerticalIcon />}
        onClick={() => setDropdownOpen((v) => !v)}
        aria-haspopup='menu'
        aria-expanded={dropdownOpen}
        variant='tertiary'
        title={t('general.options')}
        size='small'
        ref={settingsRef}
      />
      <DropdownMenu
        anchorEl={settingsRef.current}
        open={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
        size='small'
      >
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
        <Divider marginless />
        <DropdownMenu.Group>
          <DeletePopover onClose={() => setDropdownOpen(false)} onDelete={handleConfirmDelete} />
        </DropdownMenu.Group>
      </DropdownMenu>
    </div>
  );
};
