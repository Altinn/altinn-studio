import React from 'react';
import classes from './PolicyEditorDropdownMenu.module.css';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from 'libs/studio-icons/src';
import { useTranslation } from 'react-i18next';
import { StudioButton } from '@studio/components-legacy';

export type PolicyEditorDropdownMenuProps = {
  isOpen: boolean;
  handleClickMoreIcon: () => void;
  handleCloseMenu: () => void;
  handleClone: () => void;
  handleDelete: () => void;
  isError?: boolean;
};

export const PolicyEditorDropdownMenu = ({
  isOpen,
  handleClickMoreIcon,
  handleCloseMenu,
  handleClone,
  handleDelete,
  isError = false,
}: PolicyEditorDropdownMenuProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <DropdownMenu onClose={handleCloseMenu} placement='bottom-end' size='small' open={isOpen}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={isOpen}
          aria-haspopup='menu'
          className={isError && classes.errorButton}
          color={isError ? 'danger' : 'second'}
          icon={<MenuElipsisVerticalIcon fontSize='1.8rem' />}
          onClick={handleClickMoreIcon}
          title={t('policy_editor.more')}
          variant='tertiary'
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Group>
          <DropdownMenu.Item onClick={handleClone}>
            <TabsIcon className={classes.icon} />
            {t('policy_editor.expandable_card_dropdown_copy')}
          </DropdownMenu.Item>
          <DropdownMenu.Item className={classes.deleteButton} onClick={handleDelete}>
            <TrashIcon className={classes.icon} />
            {t('general.delete')}
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
