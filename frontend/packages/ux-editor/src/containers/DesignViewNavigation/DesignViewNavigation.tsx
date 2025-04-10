import React, { useState } from 'react';
import { StudioButton, StudioSectionHeader } from '@studio/components-legacy';
import classes from './DesignViewNavigation.module.css';
import { MenuElipsisVerticalIcon, MinusCircleIcon, PlusCircleIcon } from '@studio/icons';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';

export const DesignViewNavigation = () => {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div data-testid='design-view-navigation'>
      <StudioSectionHeader
        heading={{
          text: t('ux_editor.page_layout_header'),
          level: 2,
        }}
        menu={
          <div className={classes.menu}>
            <DropdownMenu
              open={dropdownOpen}
              onClose={() => setDropdownOpen(false)}
              portal
              size='small'
            >
              <DropdownMenu.Trigger asChild>
                <StudioButton
                  icon={<MenuElipsisVerticalIcon />}
                  onClick={() => setDropdownOpen((prevState) => !prevState)}
                  aria-haspopup='menu'
                  variant='tertiary'
                  title={t('general.options')}
                />
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Group>
                  {/*Functionality and the number of items will be implemented based on the upcoming requirements.*/}
                  <DropdownMenu.Item onClick={undefined}>
                    {t('ux_editor.page_layout_perform_another_task')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={undefined}>
                    <MinusCircleIcon />
                    {t('ux_editor.page_layout_remove_group_division')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={undefined}>
                    <PlusCircleIcon />
                    {t('ux_editor.page_layout_add_group_division')}
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        }
      />
    </div>
  );
};
