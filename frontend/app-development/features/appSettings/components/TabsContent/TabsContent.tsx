import React from 'react';
import type { ReactElement } from 'react';
import type { SettingsTabId } from '../../types/SettingsTabId';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

type TabsContentProps = {
  currentTab: SettingsTabId;
};

export function TabsContent({ currentTab }: TabsContentProps): ReactElement {
  switch (currentTab) {
    case 'about': {
      return <div>About tab</div>;
    }
    case 'setup': {
      return <div>Setup tab</div>;
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
