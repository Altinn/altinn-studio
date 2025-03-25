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
    <div className={classes.container}>
      <StudioSectionHeader
        heading={{
          text: t('ux_editor.side_oppsett_header'),
          level: 2,
        }}
        menu={
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
                  {t('ux_editor.side_oppsett_perfome_another_task')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={undefined}>
                  <MinusCircleIcon />

                  {t('ux_editor.side_oppsett_remove_group_division')}
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={undefined}>
                  <PlusCircleIcon />
                  {t('ux_editor.side_oppsett_add_group_division')}
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu>
        }
      />
    </div>
  );
};
