import React from 'react';
import './styles/index.css';
import { AppContextProvider } from './AppContext';
import { App } from './App';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';
import { FormDesignerNavigation } from './containers/FormDesignNavigation';
import { useAppContext } from './hooks';

type SubAppProps = {
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
};

const UiEditor = () => {
  const isTaskNavigationEnabled = shouldDisplayFeature(FeatureFlag.TaskNavigation);
  const { selectedFormLayoutSetName } = useAppContext();

  return isTaskNavigationEnabled && !selectedFormLayoutSetName ? (
    <FormDesignerNavigation />
  ) : (
    <App />
  );
};

export const SubApp = (props: SubAppProps) => {
  return (
    <AppContextProvider {...props}>
      <UiEditor />
    </AppContextProvider>
  );
};
