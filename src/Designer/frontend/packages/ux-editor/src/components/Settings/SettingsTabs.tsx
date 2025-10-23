import type { ReactElement } from 'react';
import React from 'react';
import { StudioHeading, StudioAlert, StudioTabs } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './SettingsTabs.module.css';
import { CompassIcon, DatabaseIcon } from '@studio/icons';
import { SettingsNavigation } from './SettingsNavigation/SettingsNavigation';

enum Tabs {
  Navigation = 'navigation',
  Database = 'database',
}

export const SettingsTabs = (): ReactElement => {
  const { t } = useTranslation();

  return (
    <div>
      <StudioHeading level={2} className={classes.heading}>
        {t('ux_editor.settings.other_settings')}
      </StudioHeading>
      <StudioTabs defaultValue={Tabs.Navigation}>
        <StudioTabs.List>
          <StudioTabs.Tab value={Tabs.Navigation}>
            <CompassIcon className={classes.icon} />
            {t('ux_editor.settings.navigation_tab')}
          </StudioTabs.Tab>
          <StudioTabs.Tab value={Tabs.Database}>
            <DatabaseIcon className={classes.icon} />
            {t('ux_editor.settings.data_model_tab')}
          </StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Panel value={Tabs.Navigation}>
          <SettingsNavigation />
        </StudioTabs.Panel>
        <StudioTabs.Panel value={Tabs.Database}>
          <StudioAlert className={classes.wipMessage}>
            {t('ux_editor.settings.wip_message')}
          </StudioAlert>
        </StudioTabs.Panel>
      </StudioTabs>
    </div>
  );
};
