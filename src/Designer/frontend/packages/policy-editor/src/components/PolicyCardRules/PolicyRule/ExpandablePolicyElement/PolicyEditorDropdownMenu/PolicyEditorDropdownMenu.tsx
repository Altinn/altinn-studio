import React from 'react';
import classes from './PolicyEditorDropdownMenu.module.css';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioDropdown } from '@studio/components';

export type PolicyEditorDropdownMenuProps = {
  handleClone: () => void;
  handleDelete: () => void;
  isError?: boolean;
};

export const PolicyEditorDropdownMenu = ({
  handleClone,
  handleDelete,
  isError = false,
}: PolicyEditorDropdownMenuProps): React.ReactNode => {
  const { t } = useTranslation();

  return (
    <StudioDropdown
      icon={<MenuElipsisVerticalIcon fontSize='1.8rem' />}
      triggerButtonVariant='tertiary'
      triggerButtonTitle={t('policy_editor.more')}
      triggerButtonClassName={isError ? classes.errorButton : undefined}
      data-color={isError ? 'danger' : 'second'}
      data-size='sm'
      placement='bottom-end'
    >
      <StudioDropdown.List>
        <StudioDropdown.Item>
          <StudioDropdown.Button role='menuitem' onClick={handleClone}>
            <TabsIcon className={classes.icon} />
            {t('policy_editor.expandable_card_dropdown_copy')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
        <StudioDropdown.Item>
          <StudioDropdown.Button
            role='menuitem'
            className={classes.deleteButton}
            onClick={handleDelete}
          >
            <TrashIcon className={classes.icon} />
            {t('general.delete')}
          </StudioDropdown.Button>
        </StudioDropdown.Item>
      </StudioDropdown.List>
    </StudioDropdown>
  );
};
