import React, { useRef } from 'react';
import classes from './PolicyEditorDropdownMenu.module.css';
import { DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components';

export type PolicyEditorDropdownMenuProps = {
  isOpen: boolean;
  handleClickMoreIcon: () => void;
  handleCloseMenu: () => void;
  handleClone: () => void;
  handleDelete: () => void;
  isError?: boolean;
};

/**
 * @component
 *    Dropdown menu component that displays a clone and a delete button
 *
 * @property {boolean}[isOpen] - Boolean for if the menu is open or not
 * @property {function}[handleClickMoreIcon] - Function to be executed when the menu icon is clicked
 * @property {function}[handleCloseMenu] - Function to be executed when closing the menu
 * @property {function}[handleClone] - Function to handle the click of the clone button
 * @property {function}[handleDelete] - Function to handle the click of the delete button
 * @property {boolean}[isError] - Optional flag for if there is an error or not
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const PolicyEditorDropdownMenu = ({
  isOpen,
  handleClickMoreIcon,
  handleCloseMenu,
  handleClone,
  handleDelete,
  isError = false,
}: PolicyEditorDropdownMenuProps): React.ReactNode => {
  const { t } = useTranslation();

  const anchorEl = useRef(null);

  return (
    <>
      <StudioButton
        aria-expanded={isOpen}
        aria-haspopup='menu'
        className={isError && classes.errorButton}
        color={isError ? 'danger' : 'second'}
        icon={<MenuElipsisVerticalIcon fontSize='1.8rem' />}
        onClick={handleClickMoreIcon}
        ref={anchorEl}
        size='small'
        title={t('policy_editor.more')}
        variant='tertiary'
      />
      <DropdownMenu
        anchorEl={anchorEl.current}
        onClose={handleCloseMenu}
        placement='bottom-end'
        size='small'
        open={isOpen}
      >
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Item onClick={handleClone}>
              <TabsIcon className={classes.icon} />
              {t('policy_editor.expandable_card_dropdown_copy')}
            </DropdownMenu.Item>
            <DropdownMenu.Item color='danger' onClick={handleDelete}>
              <TrashIcon className={classes.icon} />
              {t('general.delete')}
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  );
};
