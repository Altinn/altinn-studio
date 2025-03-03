import type { ReactElement } from 'react';
import React from 'react';
import { StudioHeading, StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './Tabs.module.css';
import { CompassIcon, DatabaseIcon } from '@studio/icons';

const SettingTabs = [
  {
    icon: CompassIcon,
    title: 'ux_editor.settings.navigation_tab',
  },
  {
    icon: DatabaseIcon,
    title: 'ux_editor.settings.data_model_tab',
  },
];

export const Tabs = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <>
      <StudioHeading level={2} size='xsmall' className={classes.heading}>
        {t('ux_editor.settings.other_settings')}
      </StudioHeading>
      <StudioTabs defaultValue={SettingTabs[0].title}>
        <StudioTabs.List>
          {SettingTabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <StudioTabs.Tab key={tab.title} value={tab.title}>
                <TabIcon className={classes.icon} />
                {t(tab.title)}
              </StudioTabs.Tab>
            );
          })}
        </StudioTabs.List>
      </StudioTabs>
    </>
  );
};
