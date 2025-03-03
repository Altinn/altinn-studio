import type { ReactElement } from 'react';
import React from 'react';
import { StudioHeading, StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './SettingsTabs.module.css';
import { CompassIcon, DatabaseIcon } from '@studio/icons';

const tabs = [
  {
    icon: CompassIcon,
    title: 'ux_editor.settings.navigation_tab',
  },
  {
    icon: DatabaseIcon,
    title: 'ux_editor.settings.data_model_tab',
  },
];

export const SettingsTabs = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <div>
      <StudioHeading level={2} size='xsmall' className={classes.heading}>
        {t('ux_editor.settings.other_settings')}
      </StudioHeading>
      <StudioTabs defaultValue={tabs[0].title}>
        <StudioTabs.List>
          {tabs.map((tab) => {
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
    </div>
  );
};
