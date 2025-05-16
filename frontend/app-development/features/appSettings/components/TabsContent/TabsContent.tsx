import React from 'react';
import type { ReactElement } from 'react';
import type { SettingsTabId } from '../../types/SettingsTabId';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { SetupTab } from './Tabs/SetupTab';
import { AboutTab } from './Tabs/AboutTab';

export type TabsContentProps = {
  currentTab: SettingsTabId;
};

export function TabsContent({ currentTab }: TabsContentProps): ReactElement {
  switch (currentTab) {
    case 'about': {
      return <AboutTab />;
    }
    case 'setup': {
      return <SetupTab />;
    }
    case 'policy': {
      return <div>Policy tab</div>;
    }
    case 'access_control': {
      return <div>Access Control tab</div>;
    }
    case 'maskinporten': {
      return shouldDisplayFeature(FeatureFlag.Maskinporten) ? <div>Maskinporten tab</div> : null;
    }
  }
}
