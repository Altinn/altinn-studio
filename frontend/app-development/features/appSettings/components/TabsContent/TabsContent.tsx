import React from 'react';
import type { ReactElement } from 'react';
import type { SettingsTabId } from '../../types/SettingsTabId';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { AccessControlTab } from './Tabs/AccessControlTab';

export type TabsContentProps = {
  currentTab: SettingsTabId;
};

export function TabsContent({ currentTab }: TabsContentProps): ReactElement {
  switch (currentTab) {
    case 'about': {
      return <AccessControlTab />; // <AboutTab />;
    }
    case 'setup': {
      return <div>Setup tab</div>;
    }
    case 'policy': {
      return <div>Policy tab</div>;
    }
    case 'access_control': {
      return <AccessControlTab />;
    }
    case 'maskinporten': {
      return shouldDisplayFeature(FeatureFlag.Maskinporten) ? <div>Maskinporten tab</div> : null;
    }
  }
}
