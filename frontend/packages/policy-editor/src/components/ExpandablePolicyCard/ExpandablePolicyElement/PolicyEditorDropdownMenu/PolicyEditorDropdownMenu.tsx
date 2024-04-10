import React from 'react';
import classes from './PolicyEditorDropdownMenu.module.css';
import { MenuElipsisVerticalIcon, TabsIcon, TrashIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { StudioDropdownMenu } from '@studio/components';

export type PolicyEditorDropdownMenuProps = {
  handleClone: () => void;
  handleDelete: () => void;
  isError?: boolean;
};

export const PolicyEditorDropdownMenu = ({
  handleClone,
  handleDelete,
  isError = false,
}: PolicyEditorDropdownMenuProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <StudioDropdownMenu
      anchorButtonProps={{
        className: isError ? classes.errorButton : '',
        color: isError ? 'danger' : 'second',
        icon: <MenuElipsisVerticalIcon />,
        size: 'small',
        'aria-label': t('policy_editor.more'),
        variant: 'tertiary',
      }}
      placement='bottom-end'
      size='small'
    >
      <StudioDropdownMenu.Content>
        <StudioDropdownMenu.Group>
          <StudioDropdownMenu.Item onClick={handleClone}>
            <TabsIcon className={classes.icon} />
            {t('policy_editor.expandable_card_dropdown_copy')}
          </StudioDropdownMenu.Item>
          <StudioDropdownMenu.Item color='danger' onClick={handleDelete}>
            <TrashIcon className={classes.icon} />
            {t('general.delete')}
          </StudioDropdownMenu.Item>
        </StudioDropdownMenu.Group>
      </StudioDropdownMenu.Content>
    </StudioDropdownMenu>
  );
};
