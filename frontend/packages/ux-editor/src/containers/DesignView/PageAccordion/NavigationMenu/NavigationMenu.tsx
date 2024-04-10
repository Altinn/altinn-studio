import React from 'react';
import { useTranslation } from 'react-i18next';
import { DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, ArrowUpIcon, ArrowDownIcon } from '@navikt/aksel-icons';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks';
import { StudioDropdownMenu } from '@studio/components';

export type NavigationMenuProps = {
  pageName: string;
  pageIsReceipt: boolean;
};

export const NavigationMenu = ({ pageName, pageIsReceipt }: NavigationMenuProps): JSX.Element => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

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

  const moveLayout = (action: 'up' | 'down') => {
    if (action === 'up' || action === 'down') {
      updateLayoutOrder({ layoutName: pageName, direction: action });
    }
  };

  return (
    <StudioDropdownMenu
      portal
      size='small'
      anchorButtonProps={{
        icon: <MenuElipsisVerticalIcon />,
        'aria-label': t('general.options'),
        variant: 'tertiary',
      }}
    >
      <DropdownMenu.Content>
        <StudioDropdownMenu.Group>
          {!pageIsReceipt && (
            <>
              <StudioDropdownMenu.Item
                onClick={() => !disableUp && moveLayout('up')}
                disabled={disableUp}
                id='move-page-up-button'
              >
                <ArrowUpIcon />
                {t('ux_editor.page_menu_up')}
              </StudioDropdownMenu.Item>
              <StudioDropdownMenu.Item
                onClick={() => !disableDown && moveLayout('down')}
                disabled={disableDown}
                id='move-page-down-button'
              >
                <ArrowDownIcon />
                {t('ux_editor.page_menu_down')}
              </StudioDropdownMenu.Item>
            </>
          )}
        </StudioDropdownMenu.Group>
      </DropdownMenu.Content>
    </StudioDropdownMenu>
  );
};
