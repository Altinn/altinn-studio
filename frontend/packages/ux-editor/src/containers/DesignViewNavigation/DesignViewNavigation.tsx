import React, { useState } from 'react';
import { StudioButton, StudioSectionHeader } from '@studio/components-legacy';
import classes from './DesignViewNavigation.module.css';
import { MenuElipsisVerticalIcon } from '@studio/icons';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import { useConvertToPageOrder } from '../../hooks/mutations/useConvertToPageOrder';
import { useConvertToPageGroups } from '../../hooks/mutations/useConvertToPageGroups';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../hooks';
import { usePagesQuery } from '../../hooks/queries/usePagesQuery';

export const DesignViewNavigation = () => {
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { mutate: convertToPageOrder } = useConvertToPageOrder(org, app, selectedFormLayoutSetName);
  const { mutate: convertToPageGroups } = useConvertToPageGroups(
    org,
    app,
    selectedFormLayoutSetName,
  );
  const { data: pagesModel } = usePagesQuery(org, app, selectedFormLayoutSetName);

  const isUsingPageGroups = pagesModel?.groups?.length > 0;

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
                  {isUsingPageGroups ? (
                    <DropdownMenu.Item onClick={() => convertToPageOrder()}>
                      {t('ux_editor.page_layout_remove_group_division')}
                    </DropdownMenu.Item>
                  ) : (
                    <DropdownMenu.Item onClick={() => convertToPageGroups()}>
                      {t('ux_editor.page_layout_add_group_division')}
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        }
      />
    </div>
  );
};
