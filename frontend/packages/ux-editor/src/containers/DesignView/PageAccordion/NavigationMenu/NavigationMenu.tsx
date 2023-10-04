import React, { ReactNode, MouseEvent, SyntheticEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@digdir/design-system-react';
import {
  MenuElipsisVerticalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilIcon,
  TrashIcon,
} from '@navikt/aksel-icons';
import { AltinnMenu, AltinnMenuItem } from 'app-shared/components';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { useUpdateLayoutOrderMutation } from '../../../../hooks/mutations/useUpdateLayoutOrderMutation';
import { useUpdateLayoutNameMutation } from '../../../../hooks/mutations/useUpdateLayoutNameMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelector } from 'react-redux';
import { useDeleteLayoutMutation } from '../../../../hooks/mutations/useDeleteLayoutMutation';
import { selectedLayoutSetSelector } from '../../../../selectors/formLayoutSelectors';
import type { IAppState } from '../../../../types/global';
import { Divider } from 'app-shared/primitives';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useSearchParams } from 'react-router-dom';
import { firstAvailableLayout } from '../../../../utils/formLayoutsUtils';
import { InputPopover } from './InputPopover';
import { deepCopy } from 'app-shared/pure';

export type NavigationMenuProps = {
  /**
   * The name of the page
   */
  pageName: string;
};

/**
 * @component
 *    Displays the buttons to move a page accoridon up or down, edit the name and delete the page
 *
 * @property {string}[pageName] - The name of the page
 *
 * @returns {ReactNode} - The rendered component
 */
export const NavigationMenu = ({ pageName }: NavigationMenuProps): ReactNode => {
  const { t } = useTranslation();

  const { org, app } = useStudioUrlParams();

  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
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

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>();

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayout = searchParams.get('layout');

  const onPageSettingsClick = (event: MouseEvent<HTMLButtonElement>) =>
    setMenuAnchorEl(event.currentTarget);

  const onMenuClose = (_event: SyntheticEvent) => setMenuAnchorEl(null);

  const onMenuItemClick = (event: SyntheticEvent, action: 'up' | 'down' | 'edit' | 'delete') => {
    if (action === 'delete') {
      setIsConfirmDeleteDialogOpen((prevState) => !prevState);
    } else if (action === 'edit') {
      setIsEditDialogOpen((prevState) => !prevState);
    } else {
      if (action === 'up' || action === 'down') {
        updateLayoutOrder({ layoutName: pageName, direction: action });
      }
      setMenuAnchorEl(null);
    }
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
        onClick={onPageSettingsClick}
        style={menuAnchorEl ? { visibility: 'visible' } : {}}
        variant='quiet'
        title={t('general.options')}
        size='small'
      />
      <AltinnMenu anchorEl={menuAnchorEl} open={Boolean(menuAnchorEl)} onClose={onMenuClose}>
        {layoutOrder.includes(pageName) && (
          <AltinnMenuItem
            onClick={(event) => onMenuItemClick(event, 'up')}
            disabled={disableUp || invalid}
            text={t('ux_editor.page_menu_up')}
            icon={ArrowUpIcon}
            id='move-page-up-button'
          />
        )}
        {layoutOrder.includes(pageName) && (
          <AltinnMenuItem
            onClick={(event) => onMenuItemClick(event, 'down')}
            disabled={disableDown || invalid}
            text={t('ux_editor.page_menu_down')}
            icon={ArrowDownIcon}
            id='move-page-down-button'
          />
        )}
        <InputPopover
          oldName={pageName}
          layoutOrder={layoutOrder}
          saveNewName={handleSaveNewName}
          onClose={() => {
            setIsEditDialogOpen(false);
            setMenuAnchorEl(null);
          }}
          open={isEditDialogOpen}
          trigger={
            <AltinnMenuItem
              onClick={(event) => onMenuItemClick(event, 'edit')}
              text={t('ux_editor.page_menu_edit')}
              icon={PencilIcon}
              id='edit-page-button'
              disabled={invalid}
            />
          }
        />
        <Divider marginless />
        <AltinnConfirmDialog
          open={isConfirmDeleteDialogOpen}
          confirmText={t('ux_editor.page_delete_confirm')}
          onConfirm={() => {
            handleConfirmDelete();
            setMenuAnchorEl(null);
          }}
          onClose={() => {
            setIsConfirmDeleteDialogOpen(false);
            setMenuAnchorEl(null);
          }}
          trigger={
            <AltinnMenuItem
              onClick={(event) => onMenuItemClick(event, 'delete')}
              text={t('ux_editor.page_menu_delete')}
              icon={TrashIcon}
              id='delete-page-button'
            />
          }
        >
          <p>{t('ux_editor.page_delete_text')}</p>
          <p>{t('ux_editor.page_delete_information')}</p>
        </AltinnConfirmDialog>
      </AltinnMenu>
    </div>
  );
};
