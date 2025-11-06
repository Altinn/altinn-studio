import React from 'react';
import './styles/index.css';
import { AppContextProvider } from './AppContext';
import { App as FormDesigner } from './App';
import { FormDesignerNavigation } from './containers/FormDesignNavigation';
import { Outlet, Route, Routes } from 'react-router-dom';

type SubAppProps = {
  shouldReloadPreview: boolean;
  previewHasLoaded: () => void;
  onLayoutSetNameChange: (layoutSetName: string) => void;
};

const App = (props: SubAppProps) => {
  return (
    <AppContextProvider {...props}>
      <Outlet />
    </AppContextProvider>
  );
};

export const SubApp = (props: SubAppProps) => {
  return (
    <Routes>
      <Route element={<App {...props} />}>
        <Route index element={<FormDesignerNavigation />} />
        <Route path='/layoutSet/:layoutSet' element={<FormDesigner />} />
      </Route>
    </Routes>
  );
};
