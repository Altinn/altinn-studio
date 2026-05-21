import type { ReactElement } from 'react';
import { PolicyTab } from './Tabs/PolicyTab';
import { SetupTab } from './Tabs/SetupTab';
import { AboutTab } from './Tabs/AboutTab';
import { MaskinportenTab } from './Tabs/MaskinportenTab';
import { AccessControlTab } from './Tabs/AccessControlTab';
import { RunTab } from './Tabs/RunTab';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';
import { useAppSettingsMenuTabConfigs } from '../../hooks/useAppSettingsMenuTabConfigs';

export function TabsContent(): ReactElement {
  const menuTabConfigs = useAppSettingsMenuTabConfigs();
  const tabIds = menuTabConfigs.map((tabConfig) => tabConfig.tabId);
  const { tabToDisplay } = useCurrentSettingsTab(tabIds);

  switch (tabToDisplay) {
    case 'about': {
      return <AboutTab />;
    }
    case 'setup': {
      return <SetupTab />;
    }
    case 'policy': {
      return <PolicyTab />;
    }
    case 'access_control': {
      return <AccessControlTab />;
    }
    case 'run': {
      return <RunTab />;
    }
    case 'maskinporten': {
      return <MaskinportenTab />;
    }
  }
}
