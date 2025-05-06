import React from 'react';
import type { ReactElement } from 'react';
import classes from './AppSettings.module.css';
// import { useLocation } from 'react-router-dom';
// import type { RoutePaths } from 'app-development/enums/RoutePaths';
import type { SettingsTabId } from './types/SettingsTabId';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { useTranslation } from 'react-i18next';
import { StudioHeading } from '@studio/components';

export function AppSettings(): ReactElement {
  // const location = useLocation();
  // const state = location.state as { from: RoutePaths };
  const { t } = useTranslation();

  return (
    <div className={classes.settingsWrapper}>
      <div className={classes.leftNavWrapper}></div>
    </div>
  );
}

//<StudioHeading level={1}>{t('settings_modal.heading')}</StudioHeading>

type TabsProps = {
  currentTab: SettingsTabId;
};

function Tabs({ currentTab }: TabsProps): ReactElement {
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
