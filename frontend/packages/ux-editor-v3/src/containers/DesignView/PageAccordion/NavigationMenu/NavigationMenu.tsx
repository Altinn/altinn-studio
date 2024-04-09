import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@navikt/aksel-icons';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useUpdateLayoutNameMutation } from '../../../../hooks/mutations/useUpdateLayoutNameMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import type { IAppState } from '../../../../types/global';
import { useSearchParams } from 'react-router-dom';
import { InputPopover } from './InputPopover';
import { ObjectUtils } from '@studio/pure-functions';
import { useAppContext } from '../../../../hooks/useAppContext';
import { StudioDropdownMenu } from '@studio/components';

export type NavigationMenuProps = {
  pageName: string;
  pageIsReceipt: boolean;
};

export const NavigationMenu = ({ pageName, pageIsReceipt }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

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
    <StudioDropdownMenu
      open={dropdownOpen}
      portal
      size='small'
      anchorButtonProps={{
        icon: <MenuElipsisVerticalIcon />,
        'aria-label': t('general.options'),
        variant: 'secondary',
      }}
    >
      <DropdownMenu.Content>
        <StudioDropdownMenu.Group>
          {!pageIsReceipt && (
            <>
              <StudioDropdownMenu.Item
                onClick={() => !(disableUp || invalid) && moveLayout('up')}
                disabled={disableUp || invalid}
                id='move-page-up-button'
              >
                <ArrowUpIcon />
                {t('ux_editor.page_menu_up')}
              </StudioDropdownMenu.Item>
              <StudioDropdownMenu.Item
                onClick={() => !(disableDown || invalid) && moveLayout('down')}
                disabled={disableDown || invalid}
                id='move-page-down-button'
              >
                <ArrowDownIcon />
                {t('ux_editor.page_menu_down')}
              </StudioDropdownMenu.Item>
            </>
          )}
          <InputPopover
            oldName={pageName}
            disabled={invalid}
            layoutOrder={layoutOrder}
            saveNewName={handleSaveNewName}
            onClose={() => setDropdownOpen(false)}
          />
        </StudioDropdownMenu.Group>
      </DropdownMenu.Content>
    </StudioDropdownMenu>
  );
};
