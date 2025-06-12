import React from 'react';
import type { ReactElement } from 'react';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { PolicyTab } from './Tabs/PolicyTab';
import { SetupTab } from './Tabs/SetupTab';
import { AboutTab } from './Tabs/AboutTab';
import { MaskinportenTab } from './Tabs/MaskinportenTab';
import { AccessControlTab } from './Tabs/AccessControlTab';
import { useCurrentSettingsTab } from '../../hooks/useCurrentSettingsTab';

export function TabsContent(): ReactElement {
  const { tabToDisplay } = useCurrentSettingsTab();

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
    case 'maskinporten': {
      return shouldDisplayFeature(FeatureFlag.Maskinporten) ? <MaskinportenTab /> : null;
    }
  }
}
