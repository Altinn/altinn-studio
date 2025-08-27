import React from 'react';
import './styles/index.css';
import { AppContextProvider } from './AppContext';
import { App as FormDesigner } from './App';
import { FormDesignerNavigation } from './containers/FormDesignNavigation';
import { useAppContext } from './hooks';

type SubAppProps = {
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
};

const App = () => {
  const { selectedFormLayoutSetName } = useAppContext();
  return !selectedFormLayoutSetName ? <FormDesignerNavigation /> : <FormDesigner />;
};

export const SubApp = (props: SubAppProps) => {
  return (
    <AppContextProvider {...props}>
      <App />
    </AppContextProvider>
  );
};
