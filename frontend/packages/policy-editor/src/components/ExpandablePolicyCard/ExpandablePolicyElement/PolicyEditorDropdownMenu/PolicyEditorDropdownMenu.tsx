import React, { useRef } from 'react';
import classes from './PolicyEditorDropdownMenu.module.css';
import { Button, DropdownMenu } from '@digdir/design-system-react';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from '@altinn/icons';
import { useTranslation } from 'react-i18next';

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
      <Button
        icon={<MenuElipsisVerticalIcon title={t('policy_editor.more')} fontSize='1.8rem' />}
        onClick={handleClickMoreIcon}
        variant='tertiary'
        color={isError ? 'danger' : 'second'}
        className={isError && classes.errorButton}
        size='small'
        ref={anchorEl}
        aria-haspopup='menu'
        aria-expanded={isOpen}
      />
      <DropdownMenu
        anchorEl={anchorEl.current}
        onClose={handleCloseMenu}
        placement='bottom-end'
        size='small'
        open={isOpen}
      >
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={handleClone} icon={<TabsIcon className={classes.icon} />}>
            {t('policy_editor.expandable_card_dropdown_copy')}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            color='danger'
            onClick={handleDelete}
            icon={<TrashIcon className={classes.icon} />}
          >
            {t('general.delete')}
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu>
    </>
  );
};
